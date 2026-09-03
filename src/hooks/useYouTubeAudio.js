import { useState, useEffect, useRef, useCallback } from 'react';

export function useYouTubeAudio(arg1 = {}, arg2 = null) {
  const currentYoutubeId = typeof arg1 === 'object' && arg1 !== null ? arg1.currentYoutubeId : arg1;
  const onTrackEnded = typeof arg1 === 'object' && arg1 !== null ? arg1.onTrackEnded : arg2;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const hasUserStartedRef = useRef(false);
  const onTrackEndedRef = useRef(onTrackEnded);
  const timeTickerRef = useRef(null);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  // Keep isPlayingRef updated
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Start/Stop time ticker
  const startTimeTicker = useCallback(() => {
    if (timeTickerRef.current) clearInterval(timeTickerRef.current);
    timeTickerRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        setCurrentTime(time);
        setDuration(dur);
      }
    }, 200);
  }, []);

  const stopTimeTicker = useCallback(() => {
    if (timeTickerRef.current) {
      clearInterval(timeTickerRef.current);
      timeTickerRef.current = null;
    }
  }, []);

  // Initialize YouTube IFrame API
  useEffect(() => {
    const containerId = 'youtube-audio-engine';

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        videoId: currentYoutubeId || '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            const dur = event.target.getDuration() || 0;
            setDuration(dur);
            if (event.target.isMuted) {
              setIsMuted(event.target.isMuted());
            }
            if (hasUserStartedRef.current && currentYoutubeId) {
              try {
                event.target.loadVideoById(currentYoutubeId);
                event.target.playVideo();
              } catch (e) {
                console.warn('Error starting playback onReady:', e);
              }
            }
          },
          onStateChange: (event) => {
            // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
            const state = event.data;

            if (state === 1) {
              // PLAYING
              setIsPlaying(true);
              setIsBuffering(false);
              startTimeTicker();
            } else if (state === 2) {
              // PAUSED
              setIsPlaying(false);
              setIsBuffering(false);
              stopTimeTicker();
            } else if (state === 3) {
              // BUFFERING
              setIsBuffering(true);
            } else if (state === 0) {
              // ENDED
              setIsPlaying(false);
              stopTimeTicker();
              if (onTrackEndedRef.current) {
                onTrackEndedRef.current();
              }
            }
          },
          onError: (event) => {
            console.warn('YouTube Player Notice: Track playback issue (code:', event?.data, '). Skipping to next track...');
            setIsBuffering(false);
            if (onTrackEndedRef.current) {
              setTimeout(() => {
                if (onTrackEndedRef.current) {
                  onTrackEndedRef.current();
                }
              }, 1200);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Load YouTube IFrame API script if not already added
      const existingScript = document.getElementById('yt-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      // Chain onto existing onYouTubeIframeAPIReady if any
      const prevHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevHandler === 'function') prevHandler();
        initPlayer();
      };
    }

    return () => {
      stopTimeTicker();
    };
  }, []);

  // When active YouTube video ID changes
  useEffect(() => {
    if (!playerRef.current || !isReady || !currentYoutubeId) return;

    try {
      if (hasUserStartedRef.current || isPlayingRef.current) {
        playerRef.current.loadVideoById(currentYoutubeId);
      } else {
        playerRef.current.cueVideoById(currentYoutubeId);
      }
    } catch (err) {
      console.warn('Error loading video by ID:', err);
    }
  }, [currentYoutubeId, isReady]);

  const play = useCallback(() => {
    hasUserStartedRef.current = true;
    setIsPlaying(true);
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        } else if (typeof playerRef.current.loadVideoById === 'function' && currentYoutubeId) {
          playerRef.current.loadVideoById(currentYoutubeId);
        }
      } catch (err) {
        console.warn('Error calling playVideo:', err);
      }
    }
  }, [currentYoutubeId]);

  const pause = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (typeof playerRef.current.isMuted === 'function') {
        if (playerRef.current.isMuted()) {
          if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
          setIsMuted(false);
        } else {
          if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
          setIsMuted(true);
        }
      } else {
        setIsMuted((prev) => !prev);
      }
    } catch (err) {
      console.warn('Error toggling mute:', err);
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, []);

  const setVolume = useCallback((volumePercent) => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(Math.max(0, Math.min(100, volumePercent)));
    }
  }, []);

  return {
    isReady,
    isPlaying,
    isBuffering,
    isMuted,
    currentTime,
    duration,
    play,
    pause,
    togglePlayPause,
    toggleMute,
    seekTo,
    setVolume
  };
}
