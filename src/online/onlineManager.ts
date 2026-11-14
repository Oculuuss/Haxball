import { Ball, MatchSettings, Player, TeamId } from '../types/game';

export interface OnlineRoomState {
  code: string;
  isHost: boolean;
  myTeam: TeamId;
  status: 'disconnected' | 'connecting' | 'waiting_for_peer' | 'ready' | 'playing';
  opponentName?: string;
  errorMessage?: string;
}

export class OnlineManager {
  private ws: WebSocket | null = null;
  public roomState: OnlineRoomState = {
    code: '',
    isHost: false,
    myTeam: 'red',
    status: 'disconnected',
  };

  // Callbacks
  public onRoomUpdate?: (state: OnlineRoomState) => void;
  public onGameStart?: (settings: MatchSettings) => void;
  public onRemoteInput?: (input: {
    dx: number;
    dy: number;
    kick: boolean;
    isSuper: boolean;
    p2?: { dx: number; dy: number; kick: boolean; isSuper: boolean };
  }) => void;
  public onSyncState?: (data: {
    ball: { x: number; y: number; vx: number; vy: number; isSuperShot?: boolean };
    playerRed: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
    playerBlue: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
    playerRed2?: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
    playerBlue2?: { x: number; y: number; vx: number; vy: number; isKicking: boolean; isSuperShot?: boolean };
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

  private handleMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'room_created':
          this.roomState = {
            code: msg.code,
            isHost: true,
            myTeam: 'red',
            status: 'waiting_for_peer',
          };
          this.notifyUpdate();
          break;

        case 'peer_joined':
          this.roomState.status = 'ready';
          this.roomState.opponentName = msg.guestName || 'Mavi Takım (Misafir)';
          this.notifyUpdate();
          break;

        case 'room_joined':
          this.roomState = {
            code: msg.code,
            isHost: false,
            myTeam: 'blue',
            status: 'ready',
            opponentName: 'Kırmızı Takım (Ev Sahibi)',
          };
          this.notifyUpdate();
          break;

        case 'game_started':
          this.roomState.status = 'playing';
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
          this.roomState.status = this.roomState.isHost ? 'waiting_for_peer' : 'disconnected';
          this.roomState.errorMessage = msg.message;
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
    this.onRoomUpdate?.({ ...this.roomState });
  }

  public async createRoom(settings: MatchSettings) {
    try {
      const socket = await this.connect();
      socket.send(
        JSON.stringify({
          type: 'create_room',
          settings,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }

  public async joinRoom(code: string, options?: { awayClub?: string; guestLocalPlayers?: 1 | 2 }) {
    try {
      const socket = await this.connect();
      socket.send(
        JSON.stringify({
          type: 'join_room',
          code: code.trim().toUpperCase(),
          awayClub: options?.awayClub,
          guestLocalPlayers: options?.guestLocalPlayers,
        })
      );
    } catch (e) {
      console.error(e);
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
    p2?: { dx: number; dy: number; kick: boolean; isSuper: boolean };
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
      isHost: false,
      myTeam: 'red',
      status: 'disconnected',
    };
    this.notifyUpdate();
  }
}

export const onlineManager = new OnlineManager();
