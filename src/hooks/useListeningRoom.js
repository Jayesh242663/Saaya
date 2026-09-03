import { useState, useEffect, useRef, useCallback } from 'react';
import { roomService } from '../services/roomService.js';

export function useListeningRoom({
  trackList,
  setTrackList,
  currentTrackIndex,
  setCurrentTrackIndex,
  isPlaying,
  currentTime,
  play,
  pause,
  seekTo,
  curatedBroadcast,
  setCuratedBroadcast,
  isAiDjEnabled
}) {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomSettings, setRoomSettings] = useState({ djOnly: true, allowReactions: true });
  const [syncStatus, setSyncStatus] = useState('offline'); // 'offline' | 'in-sync' | 'syncing'
  const [activeReactions, setActiveReactions] = useState([]);
  const [roomNotification, setRoomNotification] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Refs to avoid stale closures in event listeners
  const isHostRef = useRef(false);
  const isInRoomRef = useRef(false);
  const roomIdRef = useRef(null);
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  const trackListRef = useRef(trackList);
  const isApplyingRemoteSyncRef = useRef(false);
  const pulseTimerRef = useRef(null);
  const notificationTimerRef = useRef(null);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    isInRoomRef.current = isInRoom;
  }, [isInRoom]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    trackListRef.current = trackList;
  }, [trackList]);

  // Temporary notification toast
  const triggerNotification = useCallback((message) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setRoomNotification(message);
    notificationTimerRef.current = setTimeout(() => {
      setRoomNotification(null);
    }, 4000);
  }, []);

  // Compute invite URL
  const inviteUrl = roomId
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
    : '';

  // 1. Host Pulse Ticker: sends periodic pulse every 4 seconds when in room as Host
  useEffect(() => {
    if (!isInRoom || !isHost || !roomId) {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
      return;
    }

    pulseTimerRef.current = setInterval(() => {
      roomService.sendPulse({
        roomId,
        playbackPosition: currentTimeRef.current,
        currentTrackIndex: currentTrackIndexRef.current,
        playbackState: isPlayingRef.current ? 'playing' : 'paused'
      });
    }, 4000);

    return () => {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
    };
  }, [isInRoom, isHost, roomId]);

  // 2. Register real-time incoming events
  useEffect(() => {
    const handleRoomSync = (payload) => {
      if (isHostRef.current) return; // Host dictates state, does not accept external sync in djOnly

      const { action, playback } = payload;
      isApplyingRemoteSyncRef.current = true;
      setSyncStatus('syncing');

      // Update tracks if changed
      if (Array.isArray(playback.tracks) && playback.tracks.length > 0) {
        if (JSON.stringify(playback.tracks) !== JSON.stringify(trackListRef.current)) {
          setTrackList(playback.tracks);
        }
      }

      // Update curated broadcast if provided
      if (playback.curatedBroadcast && setCuratedBroadcast) {
        setCuratedBroadcast(playback.curatedBroadcast);
      }

      // Update track index
      if (Number.isInteger(playback.currentTrackIndex) && playback.currentTrackIndex !== currentTrackIndexRef.current) {
        setCurrentTrackIndex(playback.currentTrackIndex);
      }

      // Handle playback state & position
      const targetPos = typeof playback.computedPosition === 'number'
        ? playback.computedPosition
        : playback.playbackPosition || 0;

      if (action === 'PAUSE' || playback.playbackState === 'paused') {
        pause();
        seekTo(targetPos);
      } else if (action === 'PLAY' || playback.playbackState === 'playing') {
        seekTo(targetPos);
        play();
      } else if (action === 'SEEK') {
        seekTo(targetPos);
      }

      setTimeout(() => {
        isApplyingRemoteSyncRef.current = false;
        setSyncStatus('in-sync');
      }, 300);
    };

    const handlePulseUpdate = (payload) => {
      if (isHostRef.current) return;
      const { playbackPosition, currentTrackIndex: remoteIndex, playbackState } = payload;

      // Check track divergence
      if (Number.isInteger(remoteIndex) && remoteIndex !== currentTrackIndexRef.current) {
        isApplyingRemoteSyncRef.current = true;
        setCurrentTrackIndex(remoteIndex);
        seekTo(playbackPosition || 0);
        setTimeout(() => {
          isApplyingRemoteSyncRef.current = false;
        }, 200);
      }

      // Check drift compensation (if drift > 1.5 seconds)
      const currentPos = currentTimeRef.current;
      const drift = Math.abs(currentPos - playbackPosition);
      if (drift > 1.5) {
        seekTo(playbackPosition);
      }

      // Align play/pause state if desynced
      if (playbackState === 'playing' && !isPlayingRef.current) {
        play();
      } else if (playbackState === 'paused' && isPlayingRef.current) {
        pause();
      }

      setSyncStatus('in-sync');
    };

    const handleParticipantJoined = (payload) => {
      const { participant, participants: allParticipants } = payload;
      if (allParticipants) setParticipants(allParticipants);
      if (participant) {
        triggerNotification(`${participant.name} tuned in`);
      }
    };

    const handleParticipantLeft = (payload) => {
      const { participant, newHost, participants: allParticipants } = payload;
      if (allParticipants) setParticipants(allParticipants);
      if (participant) {
        triggerNotification(`${participant.name} left`);
      }
      if (newHost && newHost.id === roomService.socketId) {
        setIsHost(true);
        triggerNotification('Host role transferred to you');
      }
    };

    const handleReactionReceived = (reaction) => {
      setActiveReactions((prev) => [...prev.slice(-15), reaction]); // keep last 15
      // Auto-remove reaction after 3.5 seconds
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    };

    const handleSettingsUpdated = (payload) => {
      if (payload.settings) {
        setRoomSettings(payload.settings);
        triggerNotification('Room settings updated');
      }
    };

    const handleRoomLeft = () => {
      setIsInRoom(false);
      setIsHost(false);
      setRoomId(null);
      setParticipants([]);
      setSyncStatus('offline');
      triggerNotification('Left the station');
    };

    const unsubSync = roomService.on('ROOM_SYNC', handleRoomSync);
    const unsubPulse = roomService.on('PULSE_UPDATE', handlePulseUpdate);
    const unsubJoin = roomService.on('PARTICIPANT_JOINED', handleParticipantJoined);
    const unsubLeft = roomService.on('PARTICIPANT_LEFT', handleParticipantLeft);
    const unsubReaction = roomService.on('REACTION_RECEIVED', handleReactionReceived);
    const unsubSettings = roomService.on('SETTINGS_UPDATED', handleSettingsUpdated);
    const unsubRoomLeft = roomService.on('ROOM_LEFT', handleRoomLeft);

    return () => {
      unsubSync();
      unsubPulse();
      unsubJoin();
      unsubLeft();
      unsubReaction();
      unsubSettings();
      unsubRoomLeft();
    };
  }, [
    play,
    pause,
    seekTo,
    setCurrentTrackIndex,
    setTrackList,
    setCuratedBroadcast,
    triggerNotification
  ]);

  // 3. User Actions
  const createRoom = useCallback(
    async (hostName = 'Host DJ') => {
      try {
        setIsJoining(true);
        const result = await roomService.createRoom({
          hostName,
          initialPlayback: {
            tracks: trackListRef.current,
            currentTrackIndex: currentTrackIndexRef.current,
            playbackState: isPlayingRef.current ? 'playing' : 'paused',
            playbackPosition: currentTimeRef.current,
            curatedBroadcast,
            isAiDjEnabled
          },
          settings: { djOnly: true, allowReactions: true }
        });

        setIsInRoom(true);
        setIsHost(true);
        setRoomId(result.roomId);
        setParticipants(result.room.participants || [result.participant]);
        setRoomSettings(result.room.settings || { djOnly: true, allowReactions: true });
        setSyncStatus('in-sync');
        triggerNotification(`Room ${result.roomId} created`);
        return result;
      } catch (err) {
        console.error('[useListeningRoom] Failed to create room:', err);
        throw err;
      } finally {
        setIsJoining(false);
      }
    },
    [curatedBroadcast, isAiDjEnabled, triggerNotification]
  );

  const joinRoom = useCallback(
    async (code, userName = 'Listener') => {
      try {
        setIsJoining(true);
        const result = await roomService.joinRoom({
          roomId: code,
          userName
        });

        const room = result.room;
        setIsInRoom(true);
        setIsHost(result.participant?.isHost || false);
        setRoomId(room.roomId);
        setParticipants(room.participants || []);
        setRoomSettings(room.settings || { djOnly: true, allowReactions: true });
        setSyncStatus('syncing');

        // Apply room playback state to local player
        if (Array.isArray(room.playback.tracks) && room.playback.tracks.length > 0) {
          setTrackList(room.playback.tracks);
        }
        if (room.playback.curatedBroadcast && setCuratedBroadcast) {
          setCuratedBroadcast(room.playback.curatedBroadcast);
        }
        if (Number.isInteger(room.playback.currentTrackIndex)) {
          setCurrentTrackIndex(room.playback.currentTrackIndex);
        }

        const targetPos = typeof room.playback.computedPosition === 'number'
          ? room.playback.computedPosition
          : room.playback.playbackPosition || 0;

        setTimeout(() => {
          seekTo(targetPos);
          if (room.playback.playbackState === 'playing') {
            play();
          } else {
            pause();
          }
          setSyncStatus('in-sync');
        }, 350);

        triggerNotification(`Tuned into ${room.roomId}`);
        return result;
      } catch (err) {
        console.error('[useListeningRoom] Failed to join room:', err);
        throw err;
      } finally {
        setIsJoining(false);
      }
    },
    [
      play,
      pause,
      seekTo,
      setCurrentTrackIndex,
      setTrackList,
      setCuratedBroadcast,
      triggerNotification
    ]
  );

  const leaveRoom = useCallback(() => {
    roomService.leaveRoom();
    setIsInRoom(false);
    setIsHost(false);
    setRoomId(null);
    setParticipants([]);
    setSyncStatus('offline');
  }, []);

  const sendReaction = useCallback(
    (emoji) => {
      if (!roomIdRef.current) return;
      roomService.sendReaction(roomIdRef.current, emoji);
    },
    []
  );

  const updateSettings = useCallback(
    (settings) => {
      if (!roomIdRef.current || !isHostRef.current) return;
      roomService.updateSettings(roomIdRef.current, settings);
    },
    []
  );

  // Broadcast wrappers called when user interacts with player controls
  const broadcastSyncAction = useCallback(
    (action, data) => {
      if (!isInRoomRef.current || !roomIdRef.current) return;
      if (isApplyingRemoteSyncRef.current) return;
      // If djOnly and not host, don't broadcast
      if (roomSettings.djOnly && !isHostRef.current) return;

      roomService.sendSyncAction(roomIdRef.current, action, data);
    },
    [roomSettings.djOnly]
  );

  const broadcastPlay = useCallback(
    (pos) => {
      broadcastSyncAction('PLAY', {
        playbackState: 'playing',
        playbackPosition: typeof pos === 'number' ? pos : currentTimeRef.current
      });
    },
    [broadcastSyncAction]
  );

  const broadcastPause = useCallback(
    (pos) => {
      broadcastSyncAction('PAUSE', {
        playbackState: 'paused',
        playbackPosition: typeof pos === 'number' ? pos : currentTimeRef.current
      });
    },
    [broadcastSyncAction]
  );

  const broadcastSeek = useCallback(
    (seconds) => {
      broadcastSyncAction('SEEK', {
        playbackPosition: seconds,
        playbackState: isPlayingRef.current ? 'playing' : 'paused'
      });
    },
    [broadcastSyncAction]
  );

  const broadcastTrackChange = useCallback(
    (index) => {
      broadcastSyncAction('CHANGE_TRACK', {
        currentTrackIndex: index,
        playbackPosition: 0,
        playbackState: isPlayingRef.current ? 'playing' : 'paused'
      });
    },
    [broadcastSyncAction]
  );

  const broadcastPlaylistUpdate = useCallback(
    (newTracks, newBroadcast = null) => {
      broadcastSyncAction('PLAYLIST_UPDATE', {
        tracks: newTracks,
        currentTrackIndex: 0,
        playbackPosition: 0,
        playbackState: 'playing',
        curatedBroadcast: newBroadcast
      });
    },
    [broadcastSyncAction]
  );

  return {
    isInRoom,
    isHost,
    roomId,
    inviteUrl,
    participants,
    roomSettings,
    syncStatus,
    activeReactions,
    roomNotification,
    isRoomModalOpen,
    isJoining,
    setIsRoomModalOpen,
    createRoom,
    joinRoom,
    leaveRoom,
    sendReaction,
    updateSettings,
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastTrackChange,
    broadcastPlaylistUpdate
  };
}
