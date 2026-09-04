import { useState, useEffect, useRef, useCallback } from 'react';

export function useYouTubeAudio(arg1 = {}, arg2 = null) {
  const currentYoutubeId = typeof arg1 === 'object' && arg1 !== null ? arg1.currentYoutubeId : arg1;
  const onTrackEnded = typeof arg1 === 'object' && arg1 !== null ? arg1.onTrackEnded : arg2;
  const currentTrack = typeof arg1 === 'object' && arg1 !== null ? arg1.currentTrack : null;
  const isDjSpeaking = typeof arg1 === 'object' && arg1 !== null ? Boolean(arg1.isDjSpeaking) : false;
  const onNext = typeof arg1 === 'object' && arg1 !== null ? arg1.onNext : null;
  const onPrev = typeof arg1 === 'object' && arg1 !== null ? arg1.onPrev : null;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedFraction, setLoadedFraction] = useState(0);
  const [isMusicFullyLoaded, setIsMusicFullyLoaded] = useState(false);

  const playerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const userWantsPlayRef = useRef(false);
  const hasUserStartedRef = useRef(false);
  const isDjSpeakingRef = useRef(isDjSpeaking);
  const onTrackEndedRef = useRef(onTrackEnded);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const timeTickerRef = useRef(null);
  const silentAudioRef = useRef(null);

  useEffect(() => {
    isDjSpeakingRef.current = isDjSpeaking;
  }, [isDjSpeaking]);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    onPrevRef.current = onPrev;
  }, [onPrev]);

  // Keep isPlayingRef updated
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Initialize a silent HTML5 Audio anchor
  // Mobile Chrome & Safari grant background audio privileges strictly to tabs playing native HTML5 Audio
  useEffect(() => {
    // 1-second ultra-lightweight silent WAV
    const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    const audio = new Audio(silentWav);
    audio.loop = true;
    audio.volume = 0.001; // Silent, satisfies audio hardware pipeline
    silentAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      silentAudioRef.current = null;
    };
  }, []);

  // Start/Stop time ticker
  const startTimeTicker = useCallback(() => {
    if (timeTickerRef.current) clearInterval(timeTickerRef.current);
    timeTickerRef.current = setInterval(() => {
      if (playerRef.current) {
        let time = 0;
        if (typeof playerRef.current.getCurrentTime === 'function') {
          time = playerRef.current.getCurrentTime() || 0;
          setCurrentTime(time);
        }
        if (typeof playerRef.current.getDuration === 'function') {
          const dur = playerRef.current.getDuration() || 0;
          if (dur > 0) setDuration(dur);
        }
        if (typeof playerRef.current.getVideoLoadedFraction === 'function') {
          const fraction = playerRef.current.getVideoLoadedFraction() || 0;
          setLoadedFraction(fraction);
          // Song is considered smoothly and fully loaded when buffer fraction >= 0.5 (50%+ buffered)
          // or fraction >= 0.25 after at least 4 seconds of stable playback
          if (fraction >= 0.5 || (fraction >= 0.25 && time >= 4)) {
            setIsMusicFullyLoaded(true);
          }
        }
      }
    }, 200);
  }, []);

  const stopTimeTicker = useCallback(() => {
    if (timeTickerRef.current) {
      clearInterval(timeTickerRef.current);
      timeTickerRef.current = null;
    }
  }, []);

  // Initialize YouTube IFrame API with privacy-enhanced host
  useEffect(() => {
    const containerId = 'youtube-audio-engine';

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        host: 'https://www.youtube-nocookie.com',
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
            const dur = (typeof event.target.getDuration === 'function' && event.target.getDuration()) || 0;
            if (dur > 0) {
              setDuration(dur);
            }
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

            // Constantly capture duration whenever available
            if (typeof event.target.getDuration === 'function') {
              const dur = event.target.getDuration();
              if (dur > 0) {
                setDuration(dur);
              }
            }

            if (state === 1) {
              // PLAYING
              setIsPlaying(true);
              setIsBuffering(false);
              startTimeTicker();
              if (silentAudioRef.current && silentAudioRef.current.paused && userWantsPlayRef.current) {
                silentAudioRef.current.play().catch(() => {});
              }
            } else if (state === 2) {
              // PAUSED
              // If Chrome minimized or phone locked while user wanted to play, auto-resume
              if (document.visibilityState === 'hidden' && userWantsPlayRef.current) {
                setTimeout(() => {
                  if (userWantsPlayRef.current && playerRef.current && typeof playerRef.current.playVideo === 'function') {
                    try {
                      playerRef.current.playVideo();
                    } catch (e) {}
                  }
                }, 100);
                return;
              }

              setIsPlaying(false);
              setIsBuffering(false);
              stopTimeTicker();
              if (silentAudioRef.current && !userWantsPlayRef.current) {
                silentAudioRef.current.pause();
              }
            } else if (state === 3) {
              // BUFFERING
              setIsBuffering(true);
            } else if (state === 5) {
              // CUED - stream manifest & metadata loaded, duration fully available for scrubbing!
              setIsBuffering(false);
              const dur = event.target.getDuration();
              if (dur > 0) setDuration(dur);
            } else if (state === -1) {
              // UNSTARTED
              const dur = event.target.getDuration();
              if (dur > 0) setDuration(dur);
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
      const existingScript = document.getElementById('yt-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

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

  // Keep background audio streaming when mobile Chrome tab is backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (userWantsPlayRef.current) {
          if (silentAudioRef.current && silentAudioRef.current.paused) {
            silentAudioRef.current.play().catch(() => {});
          }

          setTimeout(() => {
            if (userWantsPlayRef.current && playerRef.current && typeof playerRef.current.playVideo === 'function') {
              try {
                playerRef.current.playVideo();
              } catch (e) {}
            }
          }, 150);
        }
      } else {
        if (userWantsPlayRef.current && playerRef.current) {
          try {
            const playerState = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : -1;
            if (playerState !== 1 && playerState !== 3) {
              playerRef.current.playVideo();
            }
          } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // When active YouTube video ID changes
  useEffect(() => {
    if (!playerRef.current || !isReady || !currentYoutubeId) return;

    // Immediately seed duration from track metadata if available
    if (currentTrack?.duration > 0) {
      setDuration(currentTrack.duration);
    }
    setCurrentTime(0);
    setLoadedFraction(0);
    setIsMusicFullyLoaded(false);

    try {
      if (isDjSpeaking) {
        // While AI RJ is speaking the intro or transition:
        // Actively preload and buffer the music stream in the background!
        // We load the video at 0s, ensure player is muted, and pause at 0s so YouTube buffers media bytes into memory silently.
        if (typeof playerRef.current.mute === 'function') {
          playerRef.current.mute();
        }
        if (typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: currentYoutubeId,
            startSeconds: 0
          });
          setTimeout(() => {
            if (isDjSpeakingRef.current && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
              try {
                playerRef.current.pauseVideo();
              } catch (_) {}
            }
          }, 80);
        } else if (typeof playerRef.current.cueVideoById === 'function') {
          playerRef.current.cueVideoById(currentYoutubeId);
        }
      } else if (hasUserStartedRef.current || isPlayingRef.current || userWantsPlayRef.current) {
        playerRef.current.loadVideoById({
          videoId: currentYoutubeId,
          startSeconds: 0
        });
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } else {
        // Cue video so YouTube loads metadata, stream manifest, and duration
        playerRef.current.cueVideoById(currentYoutubeId);
      }
    } catch (err) {
      console.warn('Error loading/cueing video by ID:', err);
    }

    // Active duration probe to guarantee duration is acquired as fast as possible
    let attempts = 0;
    const probe = setInterval(() => {
      attempts++;
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        const d = playerRef.current.getDuration();
        if (d > 0) {
          setDuration(d);
          clearInterval(probe);
        }
      }
      if (attempts > 30) clearInterval(probe);
    }, 100);

    return () => clearInterval(probe);
  }, [currentYoutubeId, isReady, currentTrack, isDjSpeaking]);

  const play = useCallback(() => {
    userWantsPlayRef.current = true;
    hasUserStartedRef.current = true;
    setIsPlaying(true);

    if (silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch(() => {});
    }

    if (playerRef.current) {
      try {
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
          setIsMuted(false);
        }
        if (typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(100);
        }
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        } else if (typeof playerRef.current.loadVideoById === 'function' && currentYoutubeId) {
          playerRef.current.loadVideoById({
            videoId: currentYoutubeId,
            startSeconds: 0
          });
        }
        startTimeTicker();
      } catch (err) {
        console.warn('Error calling playVideo:', err);
      }
    }
  }, [currentYoutubeId, startTimeTicker]);

  const pause = useCallback(() => {
    userWantsPlayRef.current = false;
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
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

  const seekTo = useCallback((seconds, shouldPlay = true) => {
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seconds, true);
        }
        setCurrentTime(seconds);

        if (shouldPlay) {
          userWantsPlayRef.current = true;
          hasUserStartedRef.current = true;
          setIsPlaying(true);

          if (typeof playerRef.current.unMute === 'function') {
            playerRef.current.unMute();
            setIsMuted(false);
          }

          if (typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          } else if (typeof playerRef.current.loadVideoById === 'function' && currentYoutubeId) {
            playerRef.current.loadVideoById({
              videoId: currentYoutubeId,
              startSeconds: seconds
            });
          }

          if (silentAudioRef.current && silentAudioRef.current.paused) {
            silentAudioRef.current.play().catch(() => {});
          }

          startTimeTicker();
        }
      } catch (err) {
        console.warn('Error during seekTo:', err);
      }
    }
  }, [currentYoutubeId, startTimeTicker]);

  const setVolume = useCallback((volumePercent) => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(Math.max(0, Math.min(100, volumePercent)));
    }
  }, []);

  // Synchronize MediaSession metadata with mobile notification center & lock screen
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      const thumb =
        currentTrack.thumbnail ||
        currentTrack.cover ||
        currentTrack.image ||
        (currentTrack.youtubeId ? `https://i.ytimg.com/vi/${currentTrack.youtubeId}/hqdefault.jpg` : null);

      const artwork = thumb
        ? [
            { src: thumb, sizes: '96x96', type: 'image/jpeg' },
            { src: thumb, sizes: '128x128', type: 'image/jpeg' },
            { src: thumb, sizes: '256x256', type: 'image/jpeg' },
            { src: thumb, sizes: '512x512', type: 'image/jpeg' }
          ]
        : [];

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'SAAYA Radio',
          artist: currentTrack.artist || 'SAAYA',
          album: 'SAAYA Radio',
          artwork: artwork
        });
      } catch (err) {
        console.warn('MediaSession metadata error:', err);
      }
    }
  }, [currentTrack]);

  // Update MediaSession playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (e) {}
    }
  }, [isPlaying]);

  // Update MediaSession timeline / position state
  useEffect(() => {
    if (
      'mediaSession' in navigator &&
      duration > 0 &&
      typeof navigator.mediaSession.setPositionState === 'function'
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.max(0, Math.min(currentTime, duration))
        });
      } catch (e) {}
    }
  }, [currentTime, duration]);

  // Register MediaSession action handlers (Lock screen, smartwatch, notification bar & Bluetooth buttons)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['previoustrack', () => onPrevRef.current?.()],
      ['nexttrack', () => onNextRef.current?.()],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined) seekTo(details.seekTime);
        }
      ],
      [
        'seekbackward',
        (details) => {
          seekTo(Math.max(0, currentTime - (details.seekOffset || 10)));
        }
      ],
      [
        'seekforward',
        (details) => {
          seekTo(Math.min(duration || 0, currentTime + (details.seekOffset || 10)));
        }
      ]
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {}
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {}
      }
    };
  }, [play, pause, seekTo, currentTime, duration]);

  // Screen Wake Lock while music is actively playing
  useEffect(() => {
    let wakeLock = null;

    const requestLock = async () => {
      if ('wakeLock' in navigator && isPlaying && document.visibilityState === 'visible') {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          // Wake lock rejected or battery saver active
        }
      }
    };

    if (isPlaying) {
      requestLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [isPlaying]);

  return {
    isReady,
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
  };
}
