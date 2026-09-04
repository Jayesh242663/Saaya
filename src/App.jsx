import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCarousel, mod } from './hooks/useCarousel';
import { useYouTubeAudio } from './hooks/useYouTubeAudio';
import { useRadioShow } from './hooks/useRadioShow';
import { useThumbnailPalette } from './hooks/useThumbnailPalette';
import { useListeningRoom } from './hooks/useListeningRoom';
import { playlistCurationService } from './services/playlistCurationService';
import { weatherService } from './services/weatherService';
import { apiConfig } from './config/apiConfig';
import { Stage } from './components/Stage/Stage';
import { Navbar } from './components/Navbar/Navbar';
import { Eyebrow } from './components/Eyebrow/Eyebrow';
import { Carousel } from './components/Carousel/Carousel';
import { TrackInfo } from './components/TrackInfo/TrackInfo';
import { Controls } from './components/Controls/Controls';
import { SettingsModal } from './components/Settings/SettingsModal';
import { RoomModal } from './components/Room/RoomModal';
import { YouTubeAudioPlayer } from './components/AudioPlayer/YouTubeAudioPlayer';
import { ImportScreen } from './components/ImportScreen/ImportScreen';
import { SignalLoader } from './components/SignalLoader/SignalLoader';
import './styles/App.css';

export default function App() {
  const [appScreen, setAppScreen] = useState('import'); // 'import' | 'loading' | 'player'
  const [activeTab, setActiveTab] = useState('radio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [trackList, setTrackList] = useState([]);
  const [curatedBroadcast, setCuratedBroadcast] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [importError, setImportError] = useState('');
  const [isAiDjEnabled, setIsAiDjEnabled] = useState(() => apiConfig.isAiDjEnabled());

  const handleNextWithTransitionRef = useRef(null);
  const handlePrevRef = useRef(null);

  const {
    current,
    visibleSlots,
    isDragging,
    dragX,
    didDrag,
    move,
    setCurrent,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getOrbStyles
  } = useCarousel(trackList.length, 4, {
    onNext: () => handleNextWithTransitionRef.current?.(),
    onPrev: () => handlePrevRef.current?.()
  });

  const currentTrack = trackList[current] || trackList[0] || null;

  // AI Radio Host Orchestrator with curated broadcast support
  const {
    isDjSpeaking,
    isIntroPreparing,
    isPreloadingStandby,
    spokenText,
    currentWeather,
    playShowIntro,
    playTransition,
    preloadNextTransition,
    resetIntroState,
    stopDj
  } = useRadioShow({
    setAudioVolume: (vol) => setVolume(vol),
    curatedBroadcast: curatedBroadcast,
    onDjFailure: (err) => handleDjFailure(err)
  });

  // YouTube Audio Engine
  const {
    isPlaying,
    isBuffering,
    isMuted,
    currentTime,
    duration,
    loadedFraction,
    isMusicFullyLoaded,
    play,
    pause,
    togglePlayPause,
    toggleMute,
    seekTo,
    setVolume
  } = useYouTubeAudio({
    currentYoutubeId: currentTrack?.youtubeId,
    currentTrack,
    isDjSpeaking: isDjSpeaking || isIntroPreparing,
    onTrackEnded: handleTrackEnded,
    onNext: () => handleNextWithTransition(),
    onPrev: () => handlePrev()
  });

  // Listening Room Synchronization Engine
  const {
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
    isJoining: isRoomJoining,
    setIsRoomModalOpen,
    createRoom,
    joinRoom,
    leaveRoom,
    sendReaction,
    updateSettings: updateRoomSettings,
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastTrackChange,
    broadcastPlaylistUpdate
  } = useListeningRoom({
    trackList,
    setTrackList,
    currentTrackIndex: current,
    setCurrentTrackIndex: (idx) => setCurrent(idx),
    isPlaying,
    currentTime,
    play,
    pause,
    seekTo,
    curatedBroadcast,
    setCuratedBroadcast,
    isAiDjEnabled
  });

  // Deep-linking: auto-open join dialog if ?room=CODE present in URL query
  const [initialRoomCode, setInitialRoomCode] = useState('');
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        const clean = roomParam.trim().toUpperCase();
        setInitialRoomCode(clean);
        setIsRoomModalOpen(true);
      }
    } catch (e) {
      console.warn('Could not read room URL parameter:', e);
    }
  }, [setIsRoomModalOpen]);

  // Auto transition from 'import' screen to 'player' screen when user joins a room
  useEffect(() => {
    if (isInRoom && trackList.length > 0 && appScreen !== 'player') {
      setAppScreen('player');
    }
  }, [isInRoom, trackList.length, appScreen]);

  // Auto-advance to next track with DJ transition when track finishes
  function handleTrackEnded() {
    if (trackList.length === 0) return;
    const nextIndex = mod(current + 1, trackList.length);
    const nextTrack = trackList[nextIndex];
    const prevTrack = currentTrack;
    const transitionIndex = current;

    broadcastTrackChange(nextIndex);
    move(1);

    if (isAiDjEnabled && playTransition) {
      playTransition(
        prevTrack,
        nextTrack,
        () => {
          play();
        },
        transitionIndex
      );
    } else {
      play();
    }
  }

  // Handle playlist link extraction & curated broadcast generation
  const handleImportPlaylist = async (url) => {
    setImportError('');
    setAppScreen('loading');
    setLoadingStep('Reading your playlist');

    try {
      setLoadingStep('Finding the songs');
      const playlistData = await playlistCurationService.fetchPlaylist(url);

      if (!playlistData.tracks || playlistData.tracks.length === 0) {
        throw new Error('No tracks found in this playlist. Please ensure it is public.');
      }

      setLoadingStep('Detecting language & tuning voice');
      const weather = currentWeather || (await weatherService.getWeather());

      setLoadingStep('Building your radio show');
      const broadcastScript = await playlistCurationService.curateBroadcastScript({
        playlist: playlistData,
        weather
      });

      setTrackList(playlistData.tracks);
      setCuratedBroadcast(broadcastScript);
      resetIntroState();
      setCurrent(0);

      // Broadcast new playlist to room if in room
      broadcastPlaylistUpdate(playlistData.tracks, broadcastScript);

      setLoadingStep('Tuning the station');
      setTimeout(() => {
        setAppScreen('player');
        const firstSong = playlistData.tracks[0];
        if (firstSong) {
          if (isAiDjEnabled) {
            playShowIntro(
              firstSong,
              () => {
                // Start Song 1 ONLY after the intro monologue has completely finished!
                play();
              },
              broadcastScript?.intro,
              broadcastScript
            );
          } else {
            play();
          }
        }
      }, 700);
    } catch (err) {
      console.error('[Playlist Import Error]', err);
      setImportError(err.message || 'Failed to extract playlist. Please try again.');
      setAppScreen('import');
    }
  };

  const handleSelectSlot = useCallback(
    (slotIndex) => {
      const targetIndex = mod(slotIndex, trackList.length);
      if (targetIndex === current) {
        if (isPlaying) {
          pause();
          broadcastPause(currentTime);
        } else {
          play();
          broadcastPlay(currentTime);
        }
      } else {
        const prevTrack = currentTrack;
        const nextTrack = trackList[targetIndex];
        const transitionIndex = current;

        broadcastTrackChange(targetIndex);
        setCurrent(slotIndex);

        if (isAiDjEnabled && playTransition) {
          pause();
          playTransition(
            prevTrack,
            nextTrack,
            () => {
              play();
            },
            transitionIndex
          );
        } else {
          if (isPlaying) play();
        }
      }
    },
    [current, currentTrack, isPlaying, play, pause, setCurrent, trackList, isAiDjEnabled, playTransition, broadcastPause, broadcastPlay, broadcastTrackChange, currentTime]
  );

  const handleStartOrTogglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
      broadcastPause(currentTime);
    } else {
      play();
      broadcastPlay(currentTime);
    }
  }, [isPlaying, pause, play, broadcastPause, broadcastPlay, currentTime]);

  const handleSeek = useCallback(
    (seconds) => {
      // Direct user manipulation: interrupt any ongoing AI DJ speech, restore volume, seek and start playing directly
      stopDj();
      setVolume(100);
      seekTo(seconds, true);
      broadcastSeek(seconds);
      broadcastPlay(seconds);
    },
    [stopDj, setVolume, seekTo, broadcastSeek, broadcastPlay]
  );

  const handleToggleAiDj = useCallback(() => {
    setIsAiDjEnabled((prev) => {
      const next = !prev;
      apiConfig.setAiDjEnabled(next);
      if (!next) {
        stopDj();
        setVolume(100);
      }
      return next;
    });
  }, [setVolume, stopDj]);

  const handleDjFailure = useCallback(
    (err) => {
      console.warn('[AI DJ Notice] Commentary encountered an issue. Automatically switching to OFF AIR:', err?.message || err);
      setIsAiDjEnabled(false);
      apiConfig.setAiDjEnabled(false);
      stopDj();
      setVolume(100);
    },
    [setVolume, stopDj]
  );

  const handleNextWithTransition = useCallback(() => {
    if (trackList.length === 0) return;
    const nextIndex = mod(current + 1, trackList.length);
    const nextTrack = trackList[nextIndex];
    const prevTrack = currentTrack;
    const transitionIndex = current;

    broadcastTrackChange(nextIndex);
    move(1);

    if (isAiDjEnabled && playTransition) {
      pause();
      playTransition(
        prevTrack,
        nextTrack,
        () => {
          play();
        },
        transitionIndex
      );
    } else {
      if (isPlaying) play();
    }
  }, [current, currentTrack, isPlaying, playTransition, move, pause, play, trackList, isAiDjEnabled, broadcastTrackChange]);

  const handlePrev = useCallback(() => {
    stopDj();
    move(-1);
    const prevIndex = mod(current - 1, trackList.length);
    broadcastTrackChange(prevIndex);
    if (isPlaying) play();
  }, [current, isPlaying, move, play, stopDj, trackList.length, broadcastTrackChange]);

  // Keep navigation callback refs synchronized for useCarousel
  useEffect(() => {
    handleNextWithTransitionRef.current = handleNextWithTransition;
  }, [handleNextWithTransition]);

  useEffect(() => {
    handlePrevRef.current = handlePrev;
  }, [handlePrev]);

  // Pre-fetch and keep upcoming song's commentary on standby in memory once the current song is confirmed smoothly loaded and playing
  useEffect(() => {
    if (isPlaying && isAiDjEnabled && isMusicFullyLoaded && trackList.length > 1) {
      const nextIndex = mod(current + 1, trackList.length);
      const curr = trackList[current];
      const nxt = trackList[nextIndex];
      if (curr && nxt) {
        preloadNextTransition(curr, nxt, current);
      }
    }
  }, [current, isPlaying, isAiDjEnabled, isMusicFullyLoaded, trackList, preloadNextTransition]);

  const { targetPalette, gradient: backgroundGradient } = useThumbnailPalette(currentTrack);
  const city = apiConfig.getWeatherCity();

  return (
    <Stage targetPalette={targetPalette} backgroundGradient={backgroundGradient}>
      {/* YouTube Player iframe engine MUST always be mounted in the DOM */}
      <YouTubeAudioPlayer />

      {/* Non-intrusive Room Toast Notification */}
      {roomNotification && (
        <div className="room-toast-notification" role="status" aria-live="polite">
          <span className="room-toast-dot" aria-hidden="true" />
          <span className="room-toast-text">{roomNotification}</span>
        </div>
      )}

      {/* 1. Landing Screen (Initial Entry View) */}
      {appScreen === 'import' && (
        <ImportScreen
          onSubmit={handleImportPlaylist}
          error={importError}
          onOpenRoom={() => setIsRoomModalOpen(true)}
        />
      )}

      {/* 2. Celestial Signal Loader Screen */}
      {appScreen === 'loading' && (
        <SignalLoader currentStage={loadingStep} />
      )}

      {/* 3. Main Music Player Screen */}
      {appScreen === 'player' && (
        <>
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isMuted={isMuted}
            onToggleSound={toggleMute}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenRoom={() => setIsRoomModalOpen(true)}
            isInRoom={isInRoom}
            roomId={roomId}
            participantCount={participants.length}
            onImportPlaylist={handleImportPlaylist}
            isDjSpeaking={isDjSpeaking}
            isAiDjEnabled={isAiDjEnabled}
            onToggleAiDj={handleToggleAiDj}
            weather={currentWeather}
          />

          <section className="main" aria-label="SAAYA radio station">
            <Eyebrow
              isPlaying={isPlaying || isDjSpeaking}
              isBuffering={isBuffering}
              weather={currentWeather}
              isAiDjEnabled={isAiDjEnabled}
            />

            <Carousel
              tracks={trackList}
              visibleSlots={visibleSlots}
              isDragging={isDragging}
              dragX={dragX}
              didDragRef={didDrag}
              onSelectSlot={handleSelectSlot}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              getOrbStyles={getOrbStyles}
            />

            <TrackInfo
              track={currentTrack}
              index={current}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={handleSeek}
            />

            <Controls
              isPlaying={isPlaying || isDjSpeaking}
              isLoading={isIntroPreparing}
              onPrev={handlePrev}
              onNext={handleNextWithTransition}
              onPlayPause={handleStartOrTogglePlay}
            />
          </section>

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </>
      )}

      {/* Synchronized Ephemeral Listening Room Modal (accessible across screens) */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        isInRoom={isInRoom}
        isHost={isHost}
        roomId={roomId}
        inviteUrl={inviteUrl}
        participants={participants}
        roomSettings={roomSettings}
        syncStatus={syncStatus}
        isJoining={isRoomJoining}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onUpdateSettings={updateRoomSettings}
        initialCode={initialRoomCode}
      />
    </Stage>
  );
}
