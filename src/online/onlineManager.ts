import { ClubId, MatchSettings, OnlineRosterEntry, TeamId } from '../types/game';

export interface OnlineRoomState {
  code: string;
  myId: string;
  isHost: boolean;
  myTeam: TeamId;
  status: 'disconnected' | 'connecting' | 'waiting_for_peer' | 'ready' | 'playing';
  players: OnlineRosterEntry[];
  homeClub: ClubId;
  awayClub: ClubId;
  roomSettings?: Partial<MatchSettings>;
  errorMessage?: string;
}

export interface SyncPlayerSnapshot {
  onlineId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isKicking: boolean;
  isSuperShot?: boolean;
}

export class OnlineManager {
  private ws: WebSocket | null = null;
  public roomState: OnlineRoomState = {
    code: '',
    myId: '',
    isHost: false,
    myTeam: 'red',
    status: 'disconnected',
    players: [],
    homeClub: 'liverpool',
    awayClub: 'ipswich',
  };

  // Callbacks
  public onRoomUpdate?: (state: OnlineRoomState) => void;
  public onGameStart?: (settings: MatchSettings) => void;
  public onRemoteInput?: (input: {
    playerId: string;
    dx: number;
    dy: number;
    kick: boolean;
    isSuper: boolean;
  }) => void;
  public onSyncState?: (data: {
    ball: { x: number; y: number; vx: number; vy: number; isSuperShot?: boolean };
    players?: SyncPlayerSnapshot[];
    scoreRed: number;
    scoreBlue: number;
    timeRemaining: number;
    isOvertime: boolean;
  }) => void;
  public onGoalEvent?: (team: TeamId) => void;
  public onRematchRequested?: () => void;

  private connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(this.ws);
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;
      this.roomState.status = 'connecting';
      this.roomState.errorMessage = undefined;
      this.notifyUpdate();

      socket.onopen = () => {
        resolve(socket);
      };

      socket.onerror = (err) => {
        this.roomState.status = 'disconnected';
        this.roomState.errorMessage = 'Sunucuya bağlanılamadı.';
        this.notifyUpdate();
        reject(err);
      };

      socket.onclose = () => {
        if (this.roomState.status !== 'disconnected') {
          this.roomState.status = 'disconnected';
          this.notifyUpdate();
        }
      };

      socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  private applyRoomSnapshot(msg: any) {
    const players: OnlineRosterEntry[] = Array.isArray(msg.players) ? msg.players : this.roomState.players;
    const me = players.find((p) => p.id === this.roomState.myId);
    const redCount = players.filter((p) => p.team === 'red').length;
    const blueCount = players.filter((p) => p.team === 'blue').length;

    const nextStatus: OnlineRoomState['status'] =
      msg.state === 'playing'
        ? 'playing'
        : redCount >= 1 && blueCount >= 1
          ? 'ready'
          : 'waiting_for_peer';

    this.roomState = {
      ...this.roomState,
      code: msg.code || this.roomState.code,
      players,
      myTeam: me ? me.team : this.roomState.myTeam,
      isHost: me ? me.isHost : this.roomState.isHost,
      homeClub: (msg.homeClub as ClubId) || this.roomState.homeClub,
      awayClub: (msg.awayClub as ClubId) || this.roomState.awayClub,
      roomSettings: msg.settings || this.roomState.roomSettings,
      status: nextStatus,
      errorMessage: undefined,
    };
  }

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'room_created':
          this.roomState = {
            code: msg.code,
            myId: msg.myId || 'p1',
            isHost: true,
            myTeam: 'red',
            status: 'waiting_for_peer',
            players: msg.players || [],
            homeClub: (msg.homeClub as ClubId) || 'liverpool',
            awayClub: (msg.awayClub as ClubId) || 'ipswich',
            roomSettings: msg.settings,
          };
          this.notifyUpdate();
          break;

        case 'room_joined':
          this.roomState = {
            code: msg.code,
            myId: msg.myId || '',
            isHost: false,
            myTeam: 'blue',
            status: 'waiting_for_peer',
            players: msg.players || [],
            homeClub: (msg.homeClub as ClubId) || 'liverpool',
            awayClub: (msg.awayClub as ClubId) || 'ipswich',
            roomSettings: msg.settings,
          };
          this.applyRoomSnapshot(msg);
          this.notifyUpdate();
          break;

        case 'room_state':
          this.applyRoomSnapshot(msg);
          this.notifyUpdate();
          break;

        case 'game_started':
          this.roomState.status = 'playing';
          this.roomState.roomSettings = msg.settings || this.roomState.roomSettings;
          this.notifyUpdate();
          this.onGameStart?.(msg.settings);
          break;

        case 'player_input':
          this.onRemoteInput?.(msg);
          break;

        case 'sync_state':
          this.onSyncState?.(msg);
          break;

        case 'goal_event':
          this.onGoalEvent?.(msg.team);
          break;

        case 'rematch_request':
          this.onRematchRequested?.();
          break;

        case 'peer_left':
          if (msg.closed) {
            this.roomState = {
              code: '',
              myId: '',
              isHost: false,
              myTeam: 'red',
              status: 'disconnected',
              players: [],
              homeClub: 'liverpool',
              awayClub: 'ipswich',
              errorMessage: msg.message,
            };
          } else {
            this.roomState.errorMessage = msg.message;
          }
          this.notifyUpdate();
          break;

        case 'error':
          this.roomState.errorMessage = msg.message;
          this.notifyUpdate();
          break;
      }
    } catch {
      // Ignore
    }
  }

  private notifyUpdate() {
    this.onRoomUpdate?.({ ...this.roomState, players: [...this.roomState.players] });
  }

  public async createRoom(settings: MatchSettings, playerName?: string) {
    try {
      const socket = await this.connect();
      socket.send(
        JSON.stringify({
          type: 'create_room',
          settings,
          playerName,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }

  public async joinRoom(code: string, playerName?: string) {
    try {
      const socket = await this.connect();
      socket.send(
        JSON.stringify({
          type: 'join_room',
          code: code.trim().toUpperCase(),
          playerName,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }

  public switchTeam(team: TeamId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'switch_team', team }));
    }
  }

  public selectClub(side: TeamId, clubId: ClubId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'select_club', side, clubId }));
    }
  }

  public updateRoomSettings(settings: Partial<MatchSettings>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'update_settings', settings }));
    }
  }

  public startGame() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'start_game' }));
    }
  }

  public sendInput(input: {
    dx: number;
    dy: number;
    kick: boolean;
    isSuper: boolean;
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player_input', ...input }));
    }
  }

  public sendSyncState(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'sync_state', ...data }));
    }
  }

  public sendGoal(team: TeamId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'goal_event', team }));
    }
  }

  public sendRematch() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'rematch_request' }));
    }
  }

  public leaveRoom() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.roomState = {
      code: '',
      myId: '',
      isHost: false,
      myTeam: 'red',
      status: 'disconnected',
      players: [],
      homeClub: 'liverpool',
      awayClub: 'ipswich',
    };
    this.notifyUpdate();
  }
}

export const onlineManager = new OnlineManager();
