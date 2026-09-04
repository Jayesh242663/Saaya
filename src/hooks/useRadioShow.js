import { useState, useRef, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService.js';
import { inworldService } from '../services/inworldService.js';
import { apiConfig } from '../config/apiConfig.js';
import { weatherService } from '../services/weatherService.js';
import { translationService } from '../services/translationService.js';
import { preferenceService } from '../services/preferenceService.js';
import { voiceResolverService } from '../services/voiceResolverService.js';

export function useRadioShow({ setAudioVolume, curatedBroadcast, onDjFailure }) {
  const [isDjSpeaking, setIsDjSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [showPhase, setShowPhase] = useState('idle'); // 'idle' | 'intro' | 'music' | 'transition'
  const [currentWeather, setCurrentWeather] = useState(null);
  const hasIntroPlayedRef = useRef(false);

  // Preload initial weather on mount so UI displays the active 24-hour program immediately
  useEffect(() => {
    let isMounted = true;
    const city = apiConfig.getWeatherCity();
    weatherService.getWeather(city).then((data) => {
      if (isMounted && data) {
        setCurrentWeather(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const curatedBroadcastRef = useRef(curatedBroadcast);
  useEffect(() => {
    curatedBroadcastRef.current = curatedBroadcast;
  }, [curatedBroadcast]);

  // Allow resetting intro when a custom playlist is loaded
  const resetIntroState = useCallback(() => {
    hasIntroPlayedRef.current = false;
  }, []);

  // Smoothly ramp audio volume
  const duckMusic = useCallback(() => {
    if (setAudioVolume) {
      setAudioVolume(18); // Duck background music to 18%
    }
  }, [setAudioVolume]);

  const restoreMusic = useCallback(() => {
    if (setAudioVolume) {
      setAudioVolume(100); // Restore to 100%
    }
  }, [setAudioVolume]);

  const [isIntroPreparing, setIsIntroPreparing] = useState(false);
  const standbyTransitionRef = useRef(null);

  // Start the radio show with an AI host intro - only start music AFTER intro completes
  const playShowIntro = useCallback(
    async (firstTrack, onIntroComplete, overrideIntro, overrideBroadcast = null) => {
      if (!apiConfig.isAiDjEnabled()) {
        setShowPhase('music');
        restoreMusic();
        if (onIntroComplete) onIntroComplete();
        return;
      }

      if (hasIntroPlayedRef.current) {
        if (onIntroComplete) onIntroComplete();
        return;
      }
      hasIntroPlayedRef.current = true;

      setIsIntroPreparing(true);
      const city = apiConfig.getWeatherCity();
      setShowPhase('intro');
      duckMusic();

      try {
        const weather = await weatherService.getWeather(city);
        setCurrentWeather(weather);

        const broadcast = overrideBroadcast || curatedBroadcast || curatedBroadcastRef.current;
        const prefs = preferenceService.getPreferences();

        // Determine target language with rock-solid precedence:
        // Priority 1: User's explicit setting in Settings
        // Priority 2: Curated broadcast dominant language
        // Priority 3: Track metadata or voice mapping
        let targetLanguage = 'en-US';
        if (prefs?.language && prefs.language !== 'AUTO') {
          targetLanguage = prefs.language;
        } else if (broadcast?.dominantLanguage) {
          targetLanguage = broadcast.dominantLanguage;
        } else if (firstTrack?.languageCode) {
          targetLanguage = firstTrack.languageCode;
        } else if (firstTrack?.language === 'Hindi') {
          targetLanguage = 'hi-IN';
        } else if (firstTrack?.language === 'Marathi') {
          targetLanguage = 'mr-IN';
        } else if (prefs.voiceId === 'Meher') {
          targetLanguage = 'hi-IN';
        }

        let rawScript = overrideIntro || broadcast?.intro;
        if (!rawScript) {
          rawScript = await geminiService.generateIntro(weather, firstTrack, { ...prefs, language: targetLanguage });
        }

        // Pre-TTS Translation and phonetic script preparation stage
        const script = await translationService.prepareScriptForTts({
          rawScript,
          targetLanguage,
          track: firstTrack,
          weather
        });

        setSpokenText(script);

        const activeVoice = voiceResolverService.resolveVoice(
          prefs.voiceId,
          broadcast?.tracks || [firstTrack],
          targetLanguage
        );

        await inworldService.speak(
          script,
          () => {
            setIsIntroPreparing(false);
            setIsDjSpeaking(true);
            duckMusic();
          },
          () => {
            setIsIntroPreparing(false);
            setIsDjSpeaking(false);
            setSpokenText('');
            setShowPhase('music');
            restoreMusic();
            // Start Song 1 ONLY after the intro audio has completely finished!
            if (onIntroComplete) onIntroComplete();
          },
          {
            language: targetLanguage,
            voiceId: broadcast?.djVoice || activeVoice,
            tracks: broadcast?.tracks || [firstTrack]
          }
        );
      } catch (err) {
        console.warn('AI host intro failed, switching to OFF AIR:', err);
        setIsIntroPreparing(false);
        setIsDjSpeaking(false);
        setSpokenText('');
        setShowPhase('music');
        restoreMusic();
        if (onDjFailure) onDjFailure(err);
        if (onIntroComplete) onIntroComplete();
      }
    },
    [duckMusic, restoreMusic, curatedBroadcast]
  );

  const isPreloadingStandbyRef = useRef(null);
  const [isPreloadingStandby, setIsPreloadingStandby] = useState(false);

  // Pre-synthesize the upcoming transition and keep on standby in memory while the current song plays
  const preloadNextTransition = useCallback(
    async (currentTrack, nextTrack, transitionIndex) => {
      if (!apiConfig.isAiDjEnabled() || !currentTrack || !nextTrack) return;
      const transitionKey = `${currentTrack?.id || currentTrack?.title}->${nextTrack?.id || nextTrack?.title}`;
      if (standbyTransitionRef.current?.key === transitionKey) return;
      if (isPreloadingStandbyRef.current === transitionKey) return;

      isPreloadingStandbyRef.current = transitionKey;
      setIsPreloadingStandby(true);

      try {
        const city = apiConfig.getWeatherCity();
        const weather = await weatherService.getWeather(city);
        const broadcast = curatedBroadcast || curatedBroadcastRef.current;
        const prefs = preferenceService.getPreferences();

        let targetLanguage = 'en-US';
        if (prefs?.language && prefs.language !== 'AUTO') {
          targetLanguage = prefs.language;
        } else if (broadcast?.dominantLanguage) {
          targetLanguage = broadcast.dominantLanguage;
        } else if (nextTrack?.languageCode) {
          targetLanguage = nextTrack.languageCode;
        } else if (nextTrack?.language === 'Hindi') {
          targetLanguage = 'hi-IN';
        } else if (nextTrack?.language === 'Marathi') {
          targetLanguage = 'mr-IN';
        } else if (prefs.voiceId === 'Meher') {
          targetLanguage = 'hi-IN';
        }

        let rawScript = null;
        if (broadcast?.transitions && typeof transitionIndex === 'number') {
          rawScript = broadcast.transitions[transitionIndex];
        }
        if (!rawScript) {
          rawScript = await geminiService.generateTransition(currentTrack, nextTrack, weather, {
            ...prefs,
            language: targetLanguage
          });
        }

        const script = await translationService.prepareScriptForTts({
          rawScript,
          targetLanguage,
          track: nextTrack,
          weather
        });

        const activeVoice = voiceResolverService.resolveVoice(
          prefs.voiceId,
          broadcast?.tracks || [nextTrack],
          targetLanguage
        );

        const preloaded = await inworldService.preSynthesize(script, {
          language: targetLanguage,
          voiceId: broadcast?.djVoice || activeVoice,
          tracks: broadcast?.tracks || [nextTrack]
        });

        if (preloaded) {
          standbyTransitionRef.current = {
            key: transitionKey,
            script,
            preloaded
          };
        }
      } catch (err) {
        console.warn('Standby transition preload note:', err);
      } finally {
        if (isPreloadingStandbyRef.current === transitionKey) {
          isPreloadingStandbyRef.current = null;
        }
        setIsPreloadingStandby(false);
      }
    },
    [curatedBroadcast]
  );

  // Play DJ commentary transition between current track and upcoming track
  const playTransition = useCallback(
    async (currentTrack, nextTrack, onTransitionComplete, transitionIndex, overrideTransition) => {
      if (!apiConfig.isAiDjEnabled()) {
        if (onTransitionComplete) onTransitionComplete();
        return;
      }

      setShowPhase('transition');
      duckMusic();

      try {
        const transitionKey = `${currentTrack?.id || currentTrack?.title}->${nextTrack?.id || nextTrack?.title}`;
        const standby = standbyTransitionRef.current;

        // Instantaneous playback if next commentary is already on standby in memory
        if (standby && standby.key === transitionKey && standby.preloaded) {
          setSpokenText(standby.script);
          setIsDjSpeaking(true);
          standbyTransitionRef.current = null; // consume standby

          await inworldService.playPreloaded(
            standby.preloaded,
            () => {
              setIsDjSpeaking(true);
              duckMusic();
            },
            () => {
              setIsDjSpeaking(false);
              setSpokenText('');
              setShowPhase('music');
              restoreMusic();
              if (onTransitionComplete) onTransitionComplete();
            }
          );
          return;
        }

        const city = apiConfig.getWeatherCity();
        const weather = await weatherService.getWeather(city);
        setCurrentWeather(weather);

        const broadcast = curatedBroadcast || curatedBroadcastRef.current;
        const prefs = preferenceService.getPreferences();

        let targetLanguage = 'en-US';
        if (prefs?.language && prefs.language !== 'AUTO') {
          targetLanguage = prefs.language;
        } else if (broadcast?.dominantLanguage) {
          targetLanguage = broadcast.dominantLanguage;
        } else if (nextTrack?.languageCode) {
          targetLanguage = nextTrack.languageCode;
        } else if (nextTrack?.language === 'Hindi') {
          targetLanguage = 'hi-IN';
        } else if (nextTrack?.language === 'Marathi') {
          targetLanguage = 'mr-IN';
        } else if (prefs.voiceId === 'Meher') {
          targetLanguage = 'hi-IN';
        }

        // Check if pre-curated transition exists for this transition index
        let rawScript = overrideTransition;
        if (!rawScript && broadcast?.transitions && typeof transitionIndex === 'number') {
          rawScript = broadcast.transitions[transitionIndex];
        }
        if (!rawScript) {
          rawScript = await geminiService.generateTransition(currentTrack, nextTrack, weather, { ...prefs, language: targetLanguage });
        }

        // Pre-TTS Translation and phonetic script preparation stage
        const script = await translationService.prepareScriptForTts({
          rawScript,
          targetLanguage,
          track: nextTrack,
          weather
        });

        setSpokenText(script);
        setIsDjSpeaking(true);

        const activeVoice = voiceResolverService.resolveVoice(
          prefs.voiceId,
          broadcast?.tracks || [nextTrack],
          targetLanguage
        );

        await inworldService.speak(
          script,
          () => {
            setIsDjSpeaking(true);
            duckMusic();
          },
          () => {
            setIsDjSpeaking(false);
            setSpokenText('');
            setShowPhase('music');
            restoreMusic();
            // Advance and play the next song ONLY after transition audio has completely finished!
            if (onTransitionComplete) onTransitionComplete();
          },
          {
            language: targetLanguage,
            voiceId: broadcast?.djVoice || activeVoice,
            tracks: broadcast?.tracks || [nextTrack]
          }
        );
      } catch (err) {
        console.warn('AI host transition failed, switching to OFF AIR:', err);
        setIsDjSpeaking(false);
        setSpokenText('');
        setShowPhase('music');
        restoreMusic();
        if (onDjFailure) onDjFailure(err);
        if (onTransitionComplete) onTransitionComplete();
      }
    },
    [duckMusic, restoreMusic, curatedBroadcast]
  );

  const stopDj = useCallback(() => {
    inworldService.stop();
    setIsIntroPreparing(false);
    setIsDjSpeaking(false);
    setSpokenText('');
    restoreMusic();
  }, [restoreMusic]);

  return {
    isDjSpeaking,
    isIntroPreparing,
    isPreloadingStandby,
    spokenText,
    showPhase,
    currentWeather,
    playShowIntro,
    playTransition,
    preloadNextTransition,
    resetIntroState,
    stopDj
  };
}
