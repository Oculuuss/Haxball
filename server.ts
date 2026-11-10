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

interface PlayerClient {
  ws: WebSocket;
  team: 'red' | 'blue';
  name: string;
}

interface Room {
  code: string;
  createdAt: number;
  host: PlayerClient;
  guest?: PlayerClient;
  state: 'waiting' | 'ready' | 'playing';
  settings?: any;
}

const rooms = new Map<string, Room>();

// Generate short, human-friendly 6-character room code (e.g. "HAX821", "FUT904")
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;
  let currentTeam: 'red' | 'blue' | null = null;

  const safeSend = (socket: WebSocket, data: any) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  };

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      // 1. CREATE ROOM
      if (data.type === 'create_room') {
        const code = generateRoomCode();
        currentRoomCode = code;
        currentTeam = 'red';

        const room: Room = {
          code,
          createdAt: Date.now(),
          host: { ws, team: 'red', name: data.playerName || 'Kırmızı (Ev Sahibi)' },
          state: 'waiting',
          settings: data.settings,
        };
        rooms.set(code, room);

        safeSend(ws, {
          type: 'room_created',
          code,
          team: 'red',
          settings: data.settings,
        });
        return;
      }

      // 2. JOIN ROOM
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

        if (room.guest && room.guest.ws.readyState === WebSocket.OPEN) {
          safeSend(ws, {
            type: 'error',
            message: 'Bu oda şu an dolu (2 oyuncu mevcut).',
          });
          return;
        }

        currentRoomCode = targetCode;
        currentTeam = 'blue';

        room.guest = {
          ws,
          team: 'blue',
          name: data.playerName || 'Mavi (Misafir)',
        };
        room.state = 'ready';

        // Notify Guest
        safeSend(ws, {
          type: 'room_joined',
          code: targetCode,
          team: 'blue',
          settings: room.settings,
        });

        // Notify Host that guest connected
        safeSend(room.host.ws, {
          type: 'peer_joined',
          guestName: room.guest.name,
          team: 'blue',
        });
        return;
      }

      // 3. START MATCH (Host triggers)
      if (data.type === 'start_game') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (room && room.host.ws === ws && room.guest) {
          room.state = 'playing';
          const payload = { type: 'game_started', settings: data.settings || room.settings };
          safeSend(room.host.ws, payload);
          safeSend(room.guest.ws, payload);
        }
        return;
      }

      // 4. RELAY MESSAGES (input, game_sync, goal_scored, restart_match)
      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        const targetWs = ws === room.host.ws ? room.guest?.ws : room.host.ws;
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(message.toString());
        }
      }
    } catch {
      // Ignore parse error
    }
  });

  const handleDisconnect = () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        if (ws === room.host.ws) {
          // Host left: notify guest and delete room
          if (room.guest && room.guest.ws.readyState === WebSocket.OPEN) {
            safeSend(room.guest.ws, {
              type: 'peer_left',
              message: 'Ev sahibi odadan ayrıldı. Oda kapatıldı.',
            });
          }
          rooms.delete(currentRoomCode);
        } else if (room.guest && ws === room.guest.ws) {
          // Guest left: notify host and return room to waiting
          room.guest = undefined;
          room.state = 'waiting';
          if (room.host.ws.readyState === WebSocket.OPEN) {
            safeSend(room.host.ws, {
              type: 'peer_left',
              message: 'Rakip odadan ayrıldı. Yeni bir arkadaş bekleniyor...',
            });
          }
        }
      }
    }
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
