import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

interface RoomPlayer {
  id: string;
  ws: WebSocket;
  team: 'red' | 'blue';
  name: string;
  isHost: boolean;
}

interface Room {
  code: string;
  createdAt: number;
  nextPlayerSeq: number;
  players: RoomPlayer[];
  homeClub: string;
  awayClub: string;
  state: 'waiting' | 'ready' | 'playing';
  settings: any;
}

const rooms = new Map<string, Room>();

// Generate short, human-friendly 5-character room code (e.g. "HAX82")
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getPublicPlayers(room: Room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    isHost: p.isHost,
  }));
}

function recomputeRoomState(room: Room) {
  if (room.state === 'playing') return;
  const redCount = room.players.filter((p) => p.team === 'red').length;
  const blueCount = room.players.filter((p) => p.team === 'blue').length;
  room.state = redCount >= 1 && blueCount >= 1 ? 'ready' : 'waiting';
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;
  let currentPlayerId: string | null = null;

  const safeSend = (socket: WebSocket, data: any) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  };

  const broadcastRoomState = (room: Room) => {
    const payload = {
      type: 'room_state',
      code: room.code,
      state: room.state,
      homeClub: room.homeClub,
      awayClub: room.awayClub,
      settings: room.settings,
      players: getPublicPlayers(room),
    };
    for (const p of room.players) {
      safeSend(p.ws, payload);
    }
  };

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      // 1. CREATE ROOM
      if (data.type === 'create_room') {
        const code = generateRoomCode();
        const playerId = 'p1';
        currentRoomCode = code;
        currentPlayerId = playerId;

        const baseSettings = data.settings || {};
        const homeClub = baseSettings.homeClub || 'liverpool';
        const awayClub = baseSettings.awayClub || 'ipswich';

        const room: Room = {
          code,
          createdAt: Date.now(),
          nextPlayerSeq: 2,
          players: [
            {
              id: playerId,
              ws,
              team: 'red',
              name: (data.playerName || '').trim() || 'Oyuncu 1',
              isHost: true,
            },
          ],
          homeClub,
          awayClub,
          state: 'waiting',
          settings: {
            ...baseSettings,
            mode: 'online_room',
            homeClub,
            awayClub,
          },
        };
        rooms.set(code, room);

        safeSend(ws, {
          type: 'room_created',
          code,
          myId: playerId,
          state: room.state,
          homeClub: room.homeClub,
          awayClub: room.awayClub,
          settings: room.settings,
          players: getPublicPlayers(room),
        });
        return;
      }

      // 2. JOIN ROOM (Supports up to 8 players = 4v4)
      if (data.type === 'join_room') {
        const targetCode = (data.code || '').trim().toUpperCase();
        const room = rooms.get(targetCode);

        if (!room) {
          safeSend(ws, {
            type: 'error',
            message: `"${targetCode}" kodlu oda bulunamadı. Lütfen kodu kontrol edin.`,
          });
          return;
        }

        // Remove stale disconnected sockets
        room.players = room.players.filter((p) => p.ws.readyState === WebSocket.OPEN);

        if (room.players.length >= 8) {
          safeSend(ws, {
            type: 'error',
            message: 'Bu oda şu an dolu (en fazla 8 oyuncu / 4v4).',
          });
          return;
        }

        const redCount = room.players.filter((p) => p.team === 'red').length;
        const blueCount = room.players.filter((p) => p.team === 'blue').length;

        let assignedTeam: 'red' | 'blue' = 'blue';
        if (blueCount === 0) {
          assignedTeam = 'blue';
        } else if (redCount === 0) {
          assignedTeam = 'red';
        } else if (redCount < 4 && (redCount < blueCount || blueCount >= 4)) {
          assignedTeam = 'red';
        } else {
          assignedTeam = 'blue';
        }

        const seq = room.nextPlayerSeq++;
        const playerId = `p${seq}`;
        currentRoomCode = targetCode;
        currentPlayerId = playerId;

        const newPlayer: RoomPlayer = {
          id: playerId,
          ws,
          team: assignedTeam,
          name: (data.playerName || '').trim() || `Oyuncu ${seq}`,
          isHost: false,
        };
        room.players.push(newPlayer);
        recomputeRoomState(room);

        safeSend(ws, {
          type: 'room_joined',
          code: targetCode,
          myId: playerId,
          state: room.state,
          homeClub: room.homeClub,
          awayClub: room.awayClub,
          settings: room.settings,
          players: getPublicPlayers(room),
        });

        broadcastRoomState(room);
        return;
      }

      if (!currentRoomCode || !currentPlayerId) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const sender = room.players.find((p) => p.id === currentPlayerId);
      if (!sender) return;

      // 3. SWITCH SIDE (Join Home or Away team, max 4 players per side)
      if (data.type === 'switch_team') {
        const targetTeam: 'red' | 'blue' = data.team === 'red' ? 'red' : 'blue';
        if (sender.team === targetTeam) return;
        const targetCount = room.players.filter((p) => p.team === targetTeam).length;
        if (targetCount >= 4) {
          safeSend(ws, {
            type: 'error',
            message: 'Bu takım dolu (en fazla 4 oyuncu katılabilir).',
          });
          return;
        }
        sender.team = targetTeam;
        recomputeRoomState(room);
        broadcastRoomState(room);
        return;
      }

      // 4. SELECT CLUB INSIDE ROOM (Side captains / Host pick the 2 teams)
      if (data.type === 'select_club') {
        const side: 'red' | 'blue' = data.side === 'blue' ? 'blue' : 'red';
        const clubId = typeof data.clubId === 'string' ? data.clubId : '';
        if (!clubId) return;

        const redCaptain = room.players.find((p) => p.team === 'red');
        const blueCaptain = room.players.find((p) => p.team === 'blue');

        const canEditRed =
          side === 'red' &&
          (sender.isHost || redCaptain?.id === sender.id);
        const canEditBlue =
          side === 'blue' &&
          (blueCaptain ? blueCaptain.id === sender.id || sender.isHost : sender.isHost);

        if (canEditRed) {
          room.homeClub = clubId;
          room.settings = { ...room.settings, homeClub: clubId };
          broadcastRoomState(room);
        } else if (canEditBlue) {
          room.awayClub = clubId;
          room.settings = { ...room.settings, awayClub: clubId };
          broadcastRoomState(room);
        }
        return;
      }

      // 5. UPDATE ROOM SETTINGS (Host only)
      if (data.type === 'update_settings' && sender.isHost) {
        room.settings = {
          ...room.settings,
          ...(data.settings || {}),
          homeClub: room.homeClub,
          awayClub: room.awayClub,
        };
        broadcastRoomState(room);
        return;
      }

      // 6. START MATCH (Host triggers)
      if (data.type === 'start_game' && sender.isHost) {
        const redPlayers = room.players.filter((p) => p.team === 'red').slice(0, 4);
        const bluePlayers = room.players.filter((p) => p.team === 'blue').slice(0, 4);
        if (redPlayers.length === 0 || bluePlayers.length === 0) {
          safeSend(ws, {
            type: 'error',
            message: 'Maçı başlatmak için her iki takımda da en az 1 oyuncu olmalıdır.',
          });
          return;
        }

        const onlineRoster = [
          ...redPlayers.map((p, idx) => ({
            id: p.id,
            name: p.name,
            team: 'red' as const,
            isHost: p.isHost,
            slot: idx,
          })),
          ...bluePlayers.map((p, idx) => ({
            id: p.id,
            name: p.name,
            team: 'blue' as const,
            isHost: p.isHost,
            slot: idx,
          })),
        ];

        room.state = 'playing';
        const matchSettings = {
          ...room.settings,
          ...(data.settings || {}),
          mode: 'online_room',
          homeClub: room.homeClub,
          awayClub: room.awayClub,
          onlineRedCount: redPlayers.length,
          onlineBlueCount: bluePlayers.length,
          onlineRoster,
        };
        room.settings = matchSettings;

        const payload = { type: 'game_started', settings: matchSettings };
        for (const p of room.players) {
          safeSend(p.ws, payload);
        }
        return;
      }

      // 7. RELAY IN-GAME MESSAGES
      if (data.type === 'player_input') {
        const host = room.players.find((p) => p.isHost);
        if (host && host.ws !== ws && host.ws.readyState === WebSocket.OPEN) {
          safeSend(host.ws, {
            ...data,
            playerId: sender.id,
          });
        }
        return;
      }

      if (sender.isHost) {
        for (const p of room.players) {
          if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(message.toString());
          }
        }
      }
    } catch {
      // Ignore parse error
    }
  });

  const handleDisconnect = () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const leaving = room.players.find((p) => p.id === currentPlayerId);
    room.players = room.players.filter((p) => p.id !== currentPlayerId);

    if (leaving?.isHost) {
      for (const p of room.players) {
        safeSend(p.ws, {
          type: 'peer_left',
          closed: true,
          message: 'Ev sahibi odadan ayrıldı. Oda kapatıldı.',
        });
      }
      rooms.delete(currentRoomCode);
      return;
    }

    if (room.players.length === 0) {
      rooms.delete(currentRoomCode);
      return;
    }

    if (room.state !== 'playing') {
      recomputeRoomState(room);
    } else {
      room.state = 'ready';
    }
    broadcastRoomState(room);
  };

  ws.on('close', handleDisconnect);
  ws.on('error', handleDisconnect);
});

// Clean up stale empty rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 3 * 3600 * 1000) {
      rooms.delete(code);
    }
  }
}, 60000);

// Setup Express & Vite in dev or static in prod
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
