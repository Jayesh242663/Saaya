import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { roomManager } from '../services/roomManager.js';

/**
 * Map to hold connected client WebSockets: socketId -> WebSocket
 * @type {Map<string, WebSocket>}
 */
const clients = new Map();

/**
 * Broadcast JSON payload to all active participants in a given room
 */
export function broadcastToRoom(roomId, payload, excludeSocketId = null) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const data = JSON.stringify(payload);
  for (const [socketId] of room.participants.entries()) {
    if (excludeSocketId && socketId === excludeSocketId) continue;
    const ws = clients.get(socketId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (err) {
        console.warn(`[wsRoomHandler] Failed to send message to ${socketId}:`, err);
      }
    }
  }
}

/**
 * Initialize the Room WebSocket server onto the existing Node HTTP server
 */
export function initRoomWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    noServer: true
  });

  // Handle upgrade specifically for /ws/rooms
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws/rooms' || url.pathname === '/ws/rooms/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    const socketId = crypto.randomUUID();
    clients.set(socketId, ws);
    console.log(`[wsRoomHandler] Client connected: ${socketId}`);

    // Send welcome handshake
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        socketId
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleSocketMessage(socketId, ws, msg);
      } catch (err) {
        console.error('[wsRoomHandler] Malformed message received:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[wsRoomHandler] Client disconnected: ${socketId}`);
      handleSocketDisconnect(socketId);
      clients.delete(socketId);
    });

    ws.on('error', (err) => {
      console.warn(`[wsRoomHandler] WebSocket error on ${socketId}:`, err);
    });
  });

  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
function handleSocketMessage(socketId, ws, msg) {
  const { type, payload = {} } = msg;

  switch (type) {
    case 'PING': {
      ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      break;
    }

    // 1. Create a brand new listening room
    case 'CREATE_ROOM': {
      const { hostName, initialPlayback, settings } = payload;
      const { room, participant } = roomManager.createRoom({
        hostSocketId: socketId,
        hostName,
        initialPlayback,
        settings
      });

      const snapshot = roomManager.getRoomSnapshot(room);
      ws.send(
        JSON.stringify({
          type: 'ROOM_CREATED',
          payload: {
            roomId: room.roomId,
            participant,
            room: snapshot
          }
        })
      );
      break;
    }

    // 2. Join an existing room using invite code
    case 'JOIN_ROOM': {
      const { roomId, userName } = payload;
      const result = roomManager.joinRoom(roomId, socketId, userName);

      if (result.error) {
        ws.send(
          JSON.stringify({
            type: 'JOIN_ERROR',
            payload: {
              error: result.error,
              message: result.message
            }
          })
        );
        return;
      }

      const { room, participant } = result;
      const snapshot = roomManager.getRoomSnapshot(room);

      // Send the newly joined participant the complete current room snapshot & computed playback time
      ws.send(
        JSON.stringify({
          type: 'ROOM_JOINED',
          payload: {
            roomId: room.roomId,
            participant,
            room: snapshot
          }
        })
      );

      // Notify other participants in the room
      broadcastToRoom(
        room.roomId,
        {
          type: 'PARTICIPANT_JOINED',
          payload: {
            participant,
            participants: snapshot.participants
          }
        },
        socketId
      );
      break;
    }

    // 3. Voluntary departure from room
    case 'LEAVE_ROOM': {
      handleSocketDisconnect(socketId);
      ws.send(JSON.stringify({ type: 'ROOM_LEFT', payload: { success: true } }));
      break;
    }

    // 4. Playback synchronization action (Play, Pause, Seek, Skip, Set Playlist)
    case 'SYNC_ACTION': {
      const { roomId, action, data = {} } = payload;
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const updateResult = roomManager.updatePlayback(roomId, socketId, data);
      if (updateResult?.error) {
        ws.send(
          JSON.stringify({
            type: 'SYNC_ERROR',
            payload: updateResult
          })
        );
        return;
      }

      const snapshot = roomManager.getRoomSnapshot(room);

      // Broadcast sync action to other participants
      broadcastToRoom(
        roomId,
        {
          type: 'ROOM_SYNC',
          payload: {
            action,
            playback: snapshot.playback,
            triggeredBy: socketId
          }
        },
        socketId
      );
      break;
    }

    // 5. Periodic heartbeat sync pulse sent by the Host to keep listeners drift-free
    case 'SYNC_PULSE': {
      const { roomId, playbackPosition, currentTrackIndex, playbackState } = payload;
      const room = roomManager.getRoom(roomId);
      if (!room || room.hostSocketId !== socketId) return;

      roomManager.updatePlayback(roomId, socketId, {
        playbackPosition,
        currentTrackIndex,
        playbackState
      });

      // Broadcast lightweight pulse to listeners
      broadcastToRoom(
        roomId,
        {
          type: 'PULSE_UPDATE',
          payload: {
            playbackPosition,
            currentTrackIndex,
            playbackState,
            timestamp: Date.now()
          }
        },
        socketId
      );
      break;
    }

    // 6. Change Room Settings (e.g. DJ Only vs Democratic mode)
    case 'UPDATE_SETTINGS': {
      const { roomId, settings } = payload;
      const room = roomManager.getRoom(roomId);
      if (!room || room.hostSocketId !== socketId) return;

      if (settings.djOnly !== undefined) room.settings.djOnly = Boolean(settings.djOnly);
      if (settings.allowReactions !== undefined) room.settings.allowReactions = Boolean(settings.allowReactions);

      broadcastToRoom(roomId, {
        type: 'SETTINGS_UPDATED',
        payload: { settings: room.settings }
      });
      break;
    }

    default:
      console.warn(`[wsRoomHandler] Unhandled event: ${type}`);
  }
}

/**
 * Handle socket disconnect or departure
 */
function handleSocketDisconnect(socketId) {
  const result = roomManager.leaveRoom(socketId);
  if (!result) return;

  const { roomId, leavingParticipant, newHost, roomDestroyed, room } = result;

  if (!roomDestroyed && room) {
    const snapshot = roomManager.getRoomSnapshot(room);
    broadcastToRoom(roomId, {
      type: 'PARTICIPANT_LEFT',
      payload: {
        participant: leavingParticipant,
        newHost,
        participants: snapshot.participants
      }
    });
  }
}

/**
 * Fast HTTP check for room status before opening UI or link preview
 */
export function handleRoomHttpRequest(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  res.setHeader('Content-Type', 'application/json');

  // GET /api/rooms/:roomId/status
  const match = pathname.match(/^\/api\/rooms\/([^/]+)\/status\/?$/);
  if (req.method === 'GET' && match) {
    const roomId = match[1];
    const room = roomManager.getRoom(roomId);

    if (!room) {
      res.statusCode = 404;
      res.end(JSON.stringify({ exists: false, message: 'Room not found or expired' }));
      return;
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        exists: true,
        roomId: room.roomId,
        participantCount: room.participants.size,
        trackCount: room.playback.tracks.length,
        currentTrack: room.playback.tracks[room.playback.currentTrackIndex] || null,
        isPlaying: room.playback.playbackState === 'playing'
      })
    );
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'NOT_FOUND' }));
}
