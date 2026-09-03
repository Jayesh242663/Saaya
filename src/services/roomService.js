/**
 * Frontend WebSocket Service for Saaya Listening Rooms.
 * Handles bidirectional real-time synchronization, auto-reconnection,
 * and dispatching sync actions to the room mesh.
 */

class RoomService {
  constructor() {
    this.ws = null;
    this.socketId = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isExplicitDisconnect = false;
  }

  /**
   * Register an event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Remove an event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[RoomService] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Connect to Saaya WebSocket server
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(this.socketId);
    }

    this.isExplicitDisconnect = false;

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timeoutTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error('Connecting to room server timed out. Check your connection.'));
        }
      }, 7000);

      const safeResolve = (val) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutTimer);
          resolve(val);
        }
      };

      const safeReject = (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutTimer);
          reject(err);
        }
      };

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/rooms`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connection_status', { isConnected: true });
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data, safeResolve);
          } catch {
            console.warn('[RoomService] Non-JSON message received:', event.data);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('connection_status', { isConnected: false });

          if (!this.socketId) {
            safeReject(new Error('Connection closed before session initialized.'));
          }

          if (!this.isExplicitDisconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (err) => {
          console.warn('[RoomService] WebSocket error:', err);
          this.emit('error', err);
          if (!this.socketId) {
            safeReject(new Error('Could not connect to listening room service.'));
          }
        };
      } catch (err) {
        console.error('[RoomService] Failed to initialize WebSocket:', err);
        safeReject(err);
      }
    });
  }

  /**
   * Send JSON message to the server
   */
  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[RoomService] Socket not open, attempting connect before send:', type);
      this.connect().then(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type, payload }));
        }
      });
      return false;
    }

    this.ws.send(JSON.stringify({ type, payload }));
    return true;
  }

  /**
   * Route incoming server events
   */
  handleIncomingMessage(msg, onConnectedResolve) {
    const { type, payload } = msg;

    switch (type) {
      case 'CONNECTED':
        this.socketId = msg.socketId;
        if (onConnectedResolve) onConnectedResolve(msg.socketId);
        break;

      case 'PONG':
        break;

      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
      case 'JOIN_ERROR':
      case 'PARTICIPANT_JOINED':
      case 'PARTICIPANT_LEFT':
      case 'ROOM_SYNC':
      case 'PULSE_UPDATE':
      case 'REACTION_RECEIVED':
      case 'SETTINGS_UPDATED':
      case 'ROOM_LEFT':
        this.emit(type, payload);
        break;

      default:
        console.log('[RoomService] Unhandled socket event:', type, payload);
    }
  }

  /**
   * Keep socket active with ping every 25s
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Auto reconnect
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, delay);
  }

  /**
   * Create room
   */
  async createRoom({ hostName, initialPlayback, settings }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      const handleCreated = (payload) => {
        cleanup();
        resolve(payload);
      };

      const handleError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.off('ROOM_CREATED', handleCreated);
        this.off('error', handleError);
      };

      this.on('ROOM_CREATED', handleCreated);
      this.on('error', handleError);

      this.send('CREATE_ROOM', { hostName, initialPlayback, settings });
    });
  }

  /**
   * Join room with code
   */
  async joinRoom({ roomId, userName }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      const handleJoined = (payload) => {
        cleanup();
        resolve(payload);
      };

      const handleJoinError = (payload) => {
        cleanup();
        reject(new Error(payload.message || 'Failed to join room'));
      };

      const cleanup = () => {
        this.off('ROOM_JOINED', handleJoined);
        this.off('JOIN_ERROR', handleJoinError);
      };

      this.on('ROOM_JOINED', handleJoined);
      this.on('JOIN_ERROR', handleJoinError);

      this.send('JOIN_ROOM', { roomId, userName });
    });
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    this.send('LEAVE_ROOM', {});
    this.emit('ROOM_LEFT', {});
  }

  /**
   * Dispatch playback action to room
   */
  sendSyncAction(roomId, action, data) {
    this.send('SYNC_ACTION', { roomId, action, data });
  }

  /**
   * Dispatch periodic drift pulse
   */
  sendPulse({ roomId, playbackPosition, currentTrackIndex, playbackState }) {
    this.send('SYNC_PULSE', { roomId, playbackPosition, currentTrackIndex, playbackState });
  }

  /**
   * Send emoji reaction
   */
  sendReaction(roomId, emoji) {
    this.send('EMOJI_REACTION', { roomId, emoji });
  }

  /**
   * Update room settings
   */
  updateSettings(roomId, settings) {
    this.send('UPDATE_SETTINGS', { roomId, settings });
  }

  /**
   * Fast HTTP verification for room validity
   */
  async checkRoomStatus(roomId) {
    try {
      const cleanId = encodeURIComponent(roomId.trim().toUpperCase());
      const res = await fetch(`/api/rooms/${cleanId}/status`);
      if (!res.ok) return { exists: false };
      return await res.json();
    } catch {
      return { exists: false };
    }
  }

  /**
   * Disconnect completely
   */
  disconnect() {
    this.isExplicitDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.socketId = null;
  }
}

export const roomService = new RoomService();
