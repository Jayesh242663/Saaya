/**
 * In-Memory Ephemeral Room Manager for Saaya Listening Rooms.
 * Guarantees zero persistent storage (no database, no disk writes, no Redis).
 * Automatically cleans up sessions as soon as participants disconnect.
 */

class RoomManager {
  constructor() {
    /** @type {Map<string, Object>} roomId -> Room Object */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomId */
    this.socketToRoom = new Map();

    // Periodic sweep every 5 minutes for stale or abandoned rooms
    this.cleanupInterval = setInterval(() => {
      this.pruneStaleRooms();
    }, 5 * 60 * 1000);

    // Prevent interval from keeping Node process alive if exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Generate an aesthetically pleasing, unambiguous invite code (e.g. SAAYA-7482)
   */
  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No ambiguous 0, 1, I, O
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `SAAYA-${suffix}`;
    // If collision, retry
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  /**
   * Generates a random vibrant celestial avatar color for participants
   */
  getRandomAvatarColor() {
    const colors = [
      '#6366f1', // Indigo
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#f97316', // Orange
      '#eab308', // Amber
      '#10b981', // Emerald
      '#06b6d4', // Cyan
      '#3b82f6'  // Blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Create a new ephemeral listening room
   */
  createRoom({ hostSocketId, hostName = 'Host DJ', initialPlayback = {}, settings = {} }) {
    // Capacity guard to prevent memory exhaustion DoS
    if (this.rooms.size >= 500) {
      this.pruneStaleRooms();
      if (this.rooms.size >= 500) {
        throw new Error('Server capacity reached for concurrent listening rooms. Please try again in a moment.');
      }
    }

    // Leave any previous room
    this.leaveRoom(hostSocketId);

    const roomId = this.generateRoomCode();
    const now = Date.now();

    const hostParticipant = {
      id: hostSocketId,
      name: hostName.trim() || 'Host DJ',
      isHost: true,
      avatarColor: this.getRandomAvatarColor(),
      joinedAt: now
    };

    const participants = new Map();
    participants.set(hostSocketId, hostParticipant);

    const room = {
      roomId,
      hostSocketId,
      createdAt: now,
      lastActivity: now,
      settings: {
        djOnly: settings.djOnly !== false, // default true: host controls playback
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
      participants
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(hostSocketId, roomId);

    console.log(`[RoomManager] Created room ${roomId} by ${hostParticipant.name} (${hostSocketId})`);
    return { room, participant: hostParticipant };
  }

  /**
   * Retrieve a room by its invite code/ID
   */
  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.toUpperCase().trim()) || null;
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, socketId, userName = 'Listener') {
    const cleanId = roomId ? roomId.toUpperCase().trim() : '';
    const room = this.rooms.get(cleanId);
    if (!room) {
      return { error: 'ROOM_NOT_FOUND', message: 'This listening room does not exist or has expired.' };
    }

    // Leave any previous room
    this.leaveRoom(socketId);

    const now = Date.now();
    const participant = {
      id: socketId,
      name: userName.trim() || `Listener #${room.participants.size + 1}`,
      isHost: false,
      avatarColor: this.getRandomAvatarColor(),
      joinedAt: now
    };

    room.participants.set(socketId, participant);
    room.lastActivity = now;
    this.socketToRoom.set(socketId, cleanId);

    console.log(`[RoomManager] ${participant.name} (${socketId}) joined room ${cleanId}`);
    return { room, participant };
  }

  /**
   * Remove a socket from whichever room it is in.
   * Cleans up room immediately if empty.
   */
  leaveRoom(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const leavingParticipant = room.participants.get(socketId);
    room.participants.delete(socketId);
    room.lastActivity = Date.now();

    console.log(`[RoomManager] Socket ${socketId} left room ${roomId}. Remaining: ${room.participants.size}`);

    // If room is now empty, immediately destroy from memory (Zero storage guarantee)
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Purged empty room ${roomId} from memory`);
      return { roomId, leavingParticipant, roomDestroyed: true };
    }

    // If the host left, promote the next oldest participant to Host so party continues
    let newHost = null;
    if (room.hostSocketId === socketId) {
      const nextSocketId = room.participants.keys().next().value;
      if (nextSocketId) {
        room.hostSocketId = nextSocketId;
        newHost = room.participants.get(nextSocketId);
        if (newHost) {
          newHost.isHost = true;
          console.log(`[RoomManager] Transferred host in room ${roomId} to ${newHost.name}`);
        }
      }
    }

    return { roomId, leavingParticipant, newHost, roomDestroyed: false, room };
  }

  /**
   * Update playback state (play, pause, seek, track change, playlist update)
   */
  updatePlayback(roomId, socketId, updates) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    // Check authority: if djOnly is true, only host can update
    const isHost = room.hostSocketId === socketId;
    if (room.settings.djOnly && !isHost) {
      return { error: 'FORBIDDEN', message: 'Only the Host DJ can control playback in this room.' };
    }

    const now = Date.now();

    if (Array.isArray(updates.tracks)) {
      room.playback.tracks = updates.tracks;
    }
    if (Number.isInteger(updates.currentTrackIndex)) {
      room.playback.currentTrackIndex = updates.currentTrackIndex;
    }
    if (typeof updates.playbackPosition === 'number') {
      room.playback.playbackPosition = updates.playbackPosition;
    }
    if (updates.playbackState === 'playing' || updates.playbackState === 'paused') {
      room.playback.playbackState = updates.playbackState;
    }
    if (updates.curatedBroadcast !== undefined) {
      room.playback.curatedBroadcast = updates.curatedBroadcast;
    }
    if (updates.isAiDjEnabled !== undefined) {
      room.playback.isAiDjEnabled = Boolean(updates.isAiDjEnabled);
    }
    if (updates.currentWeather !== undefined) {
      room.playback.currentWeather = updates.currentWeather;
    }

    room.playback.lastUpdated = now;
    room.lastActivity = now;

    return { room };
  }

  /**
   * Calculate exact real-time playback position taking elapsed time into account
   */
  getComputedPosition(room) {
    if (!room) return 0;
    if (room.playback.playbackState === 'playing') {
      const elapsed = (Date.now() - room.playback.lastUpdated) / 1000;
      return room.playback.playbackPosition + Math.max(0, elapsed);
    }
    return room.playback.playbackPosition;
  }

  /**
   * Get safe serializable room snapshot to broadcast to clients
   */
  getRoomSnapshot(room) {
    if (!room) return null;
    return {
      roomId: room.roomId,
      hostSocketId: room.hostSocketId,
      createdAt: room.createdAt,
      settings: room.settings,
      playback: {
        ...room.playback,
        computedPosition: this.getComputedPosition(room)
      },
      participants: Array.from(room.participants.values())
    };
  }

  /**
   * Prune rooms that are inactive for >1 hour or have 0 participants
   */
  pruneStaleRooms() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let purgedCount = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.size === 0 || room.lastActivity < oneHourAgo) {
        // Clean up socket mappings
        for (const socketId of room.participants.keys()) {
          this.socketToRoom.delete(socketId);
        }
        this.rooms.delete(roomId);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[RoomManager] Pruned ${purgedCount} stale rooms from memory.`);
    }
  }
}

export const roomManager = new RoomManager();
