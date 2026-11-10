/**
 * Peer-to-Peer Room Service for Saaya Listening Rooms.
 *
 * Works on static/serverless hosting (e.g. Vercel) with NO dedicated backend:
 * - The HOST's browser acts as the room authority (participants, playback, settings).
 * - Listeners connect directly to the host over WebRTC data channels (PeerJS).
 * - The free public PeerJS broker is only used for the initial handshake (signaling).
 *
 * The public API and emitted events are identical to the previous WebSocket
 * implementation, so `useListeningRoom` works unchanged.
 */
import Peer from 'peerjs';

const PEER_PREFIX = 'saaya-room-';
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No ambiguous 0, 1, I, O
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6'];
const CONNECT_TIMEOUT_MS = 15000;

const PEER_OPTIONS = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

function generateRoomCode() {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return `SAAYA-${suffix}`;
}

function roomCodeToPeerId(code) {
  return `${PEER_PREFIX}${code.trim().toLowerCase()}`;
}

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

class RoomService {
  constructor() {
    this.peer = null;
    this.socketId = null;
    this.isConnected = false;
    this.listeners = new Map();

    // Role
    this.role = null; // 'host' | 'guest' | null

    // HOST state
    this.room = null; // { roomId, hostSocketId, createdAt, settings, playback, participants: Map }
    this.connections = new Map(); // peerId -> DataConnection

    // GUEST state
    this.hostConn = null;
    this.isExplicitDisconnect = false;
  }

  /* ------------------------------------------------------------------ */
  /* Event emitter                                                       */
  /* ------------------------------------------------------------------ */

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

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

  /* ------------------------------------------------------------------ */
  /* Peer lifecycle                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Open a PeerJS peer. If `id` is given, registers with that ID (host).
   */
  openPeer(id) {
    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id, PEER_OPTIONS) : new Peer(PEER_OPTIONS);
      let settled = false;

      const onOpen = (openId) => {
        if (settled) return;
        settled = true;
        peer.off('error', onError);
        resolve({ peer, id: openId });
      };

      const onError = (err) => {
        if (settled) return;
        settled = true;
        peer.off('open', onOpen);
        try {
          peer.destroy();
        } catch {
          // ignore
        }
        reject(err);
      };

      peer.on('open', onOpen);
      peer.on('error', onError);
    });
  }

  attachPeerLifecycle(peer) {
    peer.on('disconnected', () => {
      // Lost connection to signaling broker; existing data channels keep working.
      if (!this.isExplicitDisconnect && !peer.destroyed) {
        try {
          peer.reconnect();
        } catch {
          // ignore
        }
      }
    });

    peer.on('error', (err) => {
      console.warn('[RoomService] Peer error:', err?.type || err);
      this.emit('error', err);
    });
  }

  /* ------------------------------------------------------------------ */
  /* HOST                                                                */
  /* ------------------------------------------------------------------ */

  async createRoom({ hostName, initialPlayback = {}, settings = {} }) {
    this.disconnect();
    this.isExplicitDisconnect = false;

    // Try a few codes in case of an ID collision on the broker
    let opened = null;
    let roomId = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 4 && !opened; attempt++) {
      roomId = generateRoomCode();
      try {
        opened = await withTimeout(
          this.openPeer(roomCodeToPeerId(roomId)),
          CONNECT_TIMEOUT_MS,
          'Connecting to the room network timed out. Check your connection.'
        );
      } catch (err) {
        lastErr = err;
        if (err?.type !== 'unavailable-id') break;
      }
    }

    if (!opened) {
      console.error('[RoomService] Failed to create room:', lastErr);
      throw new Error(lastErr?.message || 'Could not start a listening room. Please try again.');
    }

    const { peer, id } = opened;
    this.peer = peer;
    this.socketId = id;
    this.role = 'host';
    this.isConnected = true;
    this.attachPeerLifecycle(peer);

    const now = Date.now();
    const hostParticipant = {
      id,
      name: (hostName || '').trim() || 'Host DJ',
      isHost: true,
      avatarColor: randomColor(),
      joinedAt: now
    };

    this.room = {
      roomId,
      hostSocketId: id,
      createdAt: now,
      settings: {
        djOnly: settings.djOnly !== false,
        allowReactions: settings.allowReactions !== false
      },
      playback: {
        tracks: Array.isArray(initialPlayback.tracks) ? initialPlayback.tracks : [],
        currentTrackIndex: Number.isInteger(initialPlayback.currentTrackIndex) ? initialPlayback.currentTrackIndex : 0,
        playbackState: initialPlayback.playbackState === 'playing' ? 'playing' : 'paused',
        playbackPosition: typeof initialPlayback.playbackPosition === 'number' ? initialPlayback.playbackPosition : 0,
        lastUpdated: now,
        curatedBroadcast: initialPlayback.curatedBroadcast || null,
        isAiDjEnabled: initialPlayback.isAiDjEnabled ?? true,
        currentWeather: initialPlayback.currentWeather || null
      },
      participants: new Map([[id, hostParticipant]])
    };

    peer.on('connection', (conn) => this.handleIncomingConnection(conn));

    this.emit('connection_status', { isConnected: true });

    return {
      roomId,
      participant: hostParticipant,
      room: this.getSnapshot()
    };
  }

  handleIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      this.handleGuestMessage(conn, msg);
    });

    const cleanup = () => {
      if (!this.connections.has(conn.peer)) return;
      this.connections.delete(conn.peer);
      this.removeParticipant(conn.peer);
    };

    conn.on('close', cleanup);
    conn.on('error', (err) => {
      console.warn('[RoomService] Guest connection error:', err);
      cleanup();
    });
  }

  handleGuestMessage(conn, msg) {
    const { type, payload = {} } = msg;
    const room = this.room;
    if (!room) return;

    switch (type) {
      case 'JOIN_ROOM': {
        const now = Date.now();
        const participant = {
          id: conn.peer,
          name: (payload.userName || '').trim() || `Listener #${room.participants.size + 1}`,
          isHost: false,
          avatarColor: randomColor(),
          joinedAt: now
        };
        room.participants.set(conn.peer, participant);
        this.connections.set(conn.peer, conn);

        const snapshot = this.getSnapshot();
        this.sendTo(conn, 'ROOM_JOINED', { roomId: room.roomId, participant, room: snapshot });

        const joinedPayload = { participant, participants: snapshot.participants };
        this.broadcast('PARTICIPANT_JOINED', joinedPayload, conn.peer);
        this.emit('PARTICIPANT_JOINED', joinedPayload);
        break;
      }

      case 'LEAVE_ROOM': {
        this.connections.delete(conn.peer);
        this.removeParticipant(conn.peer);
        try {
          conn.close();
        } catch {
          // ignore
        }
        break;
      }

      case 'SYNC_ACTION': {
        if (room.settings.djOnly) {
          this.sendTo(conn, 'SYNC_ERROR', {
            error: 'FORBIDDEN',
            message: 'Only the Host DJ can control playback in this room.'
          });
          return;
        }
        this.applyPlaybackUpdate(payload.data || {});
        const syncPayload = {
          action: payload.action,
          playback: this.getSnapshot().playback,
          triggeredBy: conn.peer
        };
        this.broadcast('ROOM_SYNC', syncPayload, conn.peer);
        this.emit('ROOM_SYNC', syncPayload);
        break;
      }

      case 'EMOJI_REACTION': {
        this.relayReaction(conn.peer, payload.emoji);
        break;
      }

      case 'PING': {
        this.sendTo(conn, 'PONG', { timestamp: Date.now() });
        break;
      }

      default:
        break;
    }
  }

  removeParticipant(peerId) {
    const room = this.room;
    if (!room || !room.participants.has(peerId)) return;
    const leavingParticipant = room.participants.get(peerId);
    room.participants.delete(peerId);

    const snapshot = this.getSnapshot();
    const leftPayload = {
      participant: leavingParticipant,
      newHost: null,
      participants: snapshot.participants
    };
    this.broadcast('PARTICIPANT_LEFT', leftPayload);
    this.emit('PARTICIPANT_LEFT', leftPayload);
  }

  relayReaction(fromId, emoji) {
    const room = this.room;
    if (!room || !room.settings.allowReactions || !emoji) return;
    const sender = room.participants.get(fromId);
    const reaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      emoji,
      senderId: fromId,
      senderName: sender?.name || 'Listener',
      timestamp: Date.now()
    };
    this.broadcast('REACTION_RECEIVED', reaction);
    this.emit('REACTION_RECEIVED', reaction);
  }

  applyPlaybackUpdate(updates) {
    const playback = this.room?.playback;
    if (!playback) return;

    if (Array.isArray(updates.tracks)) playback.tracks = updates.tracks;
    if (Number.isInteger(updates.currentTrackIndex)) playback.currentTrackIndex = updates.currentTrackIndex;
    if (typeof updates.playbackPosition === 'number') playback.playbackPosition = updates.playbackPosition;
    if (updates.playbackState === 'playing' || updates.playbackState === 'paused') {
      playback.playbackState = updates.playbackState;
    }
    if (updates.curatedBroadcast !== undefined) playback.curatedBroadcast = updates.curatedBroadcast;
    if (updates.isAiDjEnabled !== undefined) playback.isAiDjEnabled = Boolean(updates.isAiDjEnabled);
    if (updates.currentWeather !== undefined) playback.currentWeather = updates.currentWeather;

    playback.lastUpdated = Date.now();
  }

  getSnapshot() {
    const room = this.room;
    if (!room) return null;
    const { playback } = room;
    const computedPosition =
      playback.playbackState === 'playing'
        ? playback.playbackPosition + Math.max(0, (Date.now() - playback.lastUpdated) / 1000)
        : playback.playbackPosition;

    return {
      roomId: room.roomId,
      hostSocketId: room.hostSocketId,
      createdAt: room.createdAt,
      settings: { ...room.settings },
      playback: { ...playback, computedPosition },
      participants: Array.from(room.participants.values())
    };
  }

  sendTo(conn, type, payload) {
    if (conn && conn.open) {
      try {
        conn.send({ type, payload });
      } catch (err) {
        console.warn('[RoomService] Failed to send to peer:', err);
      }
    }
  }

  broadcast(type, payload, excludePeerId = null) {
    for (const [peerId, conn] of this.connections.entries()) {
      if (excludePeerId && peerId === excludePeerId) continue;
      if (!this.room?.participants.has(peerId)) continue;
      this.sendTo(conn, type, payload);
    }
  }

  /* ------------------------------------------------------------------ */
  /* GUEST                                                               */
  /* ------------------------------------------------------------------ */

  async joinRoom({ roomId, userName }) {
    const cleanCode = (roomId || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Please enter an invite code.');

    this.disconnect();
    this.isExplicitDisconnect = false;

    const { peer, id } = await withTimeout(
      this.openPeer(),
      CONNECT_TIMEOUT_MS,
      'Connecting to the room network timed out. Check your connection.'
    ).catch((err) => {
      throw new Error(err?.message || 'Could not connect to the room network.');
    });

    this.peer = peer;
    this.socketId = id;
    this.role = 'guest';
    this.attachPeerLifecycle(peer);

    const joinPromise = new Promise((resolve, reject) => {
      const conn = peer.connect(roomCodeToPeerId(cleanCode), { reliable: true });
      this.hostConn = conn;
      let settled = false;

      const fail = (message) => {
        if (settled) return;
        settled = true;
        peer.off('error', onPeerError);
        reject(new Error(message));
      };

      const onPeerError = (err) => {
        if (err?.type === 'peer-unavailable') {
          fail('This listening room does not exist or has ended.');
        } else {
          fail(err?.message || 'Could not connect to the listening room.');
        }
      };
      peer.on('error', onPeerError);

      conn.on('open', () => {
        this.isConnected = true;
        this.emit('connection_status', { isConnected: true });
        conn.send({ type: 'JOIN_ROOM', payload: { roomId: cleanCode, userName } });
      });

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        const { type, payload } = msg;

        if (type === 'ROOM_JOINED' && !settled) {
          settled = true;
          peer.off('error', onPeerError);
          resolve(payload);
          return;
        }

        this.emit(type, payload);
      });

      conn.on('close', () => {
        this.isConnected = false;
        this.emit('connection_status', { isConnected: false });
        if (!settled) {
          fail('Connection to the host closed.');
          return;
        }
        if (!this.isExplicitDisconnect) {
          // Host ended the room or went offline
          this.cleanupPeer();
          this.emit('ROOM_LEFT', { reason: 'HOST_ENDED' });
        }
      });

      conn.on('error', (err) => {
        console.warn('[RoomService] Host connection error:', err);
        fail('Could not connect to the listening room.');
      });
    });

    try {
      return await withTimeout(
        joinPromise,
        CONNECT_TIMEOUT_MS,
        'Could not reach the host. The room may have ended or your network blocks peer connections.'
      );
    } catch (err) {
      this.disconnect();
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Shared actions (called by useListeningRoom)                         */
  /* ------------------------------------------------------------------ */

  leaveRoom() {
    if (this.role === 'guest' && this.hostConn?.open) {
      try {
        this.hostConn.send({ type: 'LEAVE_ROOM', payload: {} });
      } catch {
        // ignore
      }
    }
    // Give the leave message a moment to flush before tearing down
    const peerToClose = this.peer;
    setTimeout(() => {
      if (this.peer === peerToClose) this.disconnect();
    }, 150);
    this.emit('ROOM_LEFT', {});
  }

  sendSyncAction(roomId, action, data = {}) {
    if (this.role === 'host') {
      this.applyPlaybackUpdate(data);
      this.broadcast('ROOM_SYNC', {
        action,
        playback: this.getSnapshot().playback,
        triggeredBy: this.socketId
      });
    } else if (this.role === 'guest') {
      this.sendToHost('SYNC_ACTION', { roomId, action, data });
    }
  }

  sendPulse({ playbackPosition, currentTrackIndex, playbackState }) {
    if (this.role !== 'host') return;
    this.applyPlaybackUpdate({ playbackPosition, currentTrackIndex, playbackState });
    this.broadcast('PULSE_UPDATE', {
      playbackPosition,
      currentTrackIndex,
      playbackState,
      timestamp: Date.now()
    });
  }

  sendReaction(roomId, emoji) {
    if (this.role === 'host') {
      this.relayReaction(this.socketId, emoji);
    } else if (this.role === 'guest') {
      this.sendToHost('EMOJI_REACTION', { roomId, emoji });
    }
  }

  updateSettings(roomId, settings = {}) {
    if (this.role !== 'host' || !this.room) return;
    if (settings.djOnly !== undefined) this.room.settings.djOnly = Boolean(settings.djOnly);
    if (settings.allowReactions !== undefined) this.room.settings.allowReactions = Boolean(settings.allowReactions);
    const payload = { settings: { ...this.room.settings } };
    this.broadcast('SETTINGS_UPDATED', payload);
    this.emit('SETTINGS_UPDATED', payload);
  }

  sendToHost(type, payload) {
    if (this.hostConn?.open) {
      try {
        this.hostConn.send({ type, payload });
        return true;
      } catch (err) {
        console.warn('[RoomService] Failed to send to host:', err);
      }
    }
    return false;
  }

  /**
   * Rooms live in the host's browser, so there is no central status lookup.
   */
  async checkRoomStatus() {
    return { exists: null };
  }

  /* ------------------------------------------------------------------ */
  /* Teardown                                                            */
  /* ------------------------------------------------------------------ */

  cleanupPeer() {
    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.connections.clear();

    if (this.hostConn) {
      try {
        this.hostConn.close();
      } catch {
        // ignore
      }
      this.hostConn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }

    this.room = null;
    this.role = null;
    this.socketId = null;
    this.isConnected = false;
  }

  disconnect() {
    this.isExplicitDisconnect = true;
    this.cleanupPeer();
  }
}

export const roomService = new RoomService();

// Close peer connections cleanly when the tab is closed so listeners are notified
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    roomService.disconnect();
  });
}
