import { useState, useRef, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService.js';
import { inworldService } from '../services/inworldService.js';
import { apiConfig } from '../config/apiConfig.js';
import { weatherService } from '../services/weatherService.js';
import { translationService } from '../services/translationService.js';
import { preferenceService } from '../services/preferenceService.js';
import { voiceResolverService } from '../services/voiceResolverService.js';

export function useRadioShow({ setAudioVolume, curatedBroadcast }) {
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

  // Start the radio show with an AI host intro - only start music AFTER intro completes
  const playShowIntro = useCallback(
    async (firstTrack, onIntroComplete, overrideIntro) => {
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

      const city = apiConfig.getWeatherCity();
      setShowPhase('intro');
      duckMusic();

      try {
        const weather = await weatherService.getWeather(city);
        setCurrentWeather(weather);

        const targetLanguage =
          curatedBroadcast?.dominantLanguage ||
          firstTrack?.languageCode ||
          (firstTrack?.language === 'Hindi' ? 'hi-IN' : firstTrack?.language === 'Marathi' ? 'mr-IN' : 'en-US');

        let rawScript = overrideIntro || curatedBroadcast?.intro;
        if (!rawScript) {
          rawScript = await geminiService.generateIntro(weather, firstTrack);
        }

        // Pre-TTS Translation and phonetic script preparation stage
        const script = await translationService.prepareScriptForTts({
          rawScript,
          targetLanguage,
          track: firstTrack,
          weather
        });

        setSpokenText(script);
        setIsDjSpeaking(true);

        const prefs = preferenceService.getPreferences();
        const activeVoice = voiceResolverService.resolveVoice(
          prefs.voiceId,
          curatedBroadcast?.tracks || [firstTrack],
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
            // Start Song 1 ONLY after the intro audio has completely finished!
            if (onIntroComplete) onIntroComplete();
          },
          {
            language: targetLanguage,
            voiceId: curatedBroadcast?.djVoice || activeVoice
          }
        );
      } catch (err) {
        console.warn('Intro speech failed:', err);
        setIsDjSpeaking(false);
        setSpokenText('');
        setShowPhase('music');
        restoreMusic();
        if (onIntroComplete) onIntroComplete();
      }
    },
    [duckMusic, restoreMusic, curatedBroadcast]
  );

  // Play DJ commentary transition between current track and upcoming track
  const playTransition = useCallback(
    async (currentTrack, nextTrack, onTransitionComplete, transitionIndex, overrideTransition) => {
      if (!apiConfig.isAiDjEnabled()) {
        if (onTransitionComplete) onTransitionComplete();
        return;
      }

      const city = apiConfig.getWeatherCity();
      setShowPhase('transition');
      duckMusic();

      try {
        const weather = await weatherService.getWeather(city);
        setCurrentWeather(weather);

        const targetLanguage =
          curatedBroadcast?.dominantLanguage ||
          nextTrack?.languageCode ||
          (nextTrack?.language === 'Hindi' ? 'hi-IN' : nextTrack?.language === 'Marathi' ? 'mr-IN' : 'en-US');

        // Check if pre-curated transition exists for this transition index
        let rawScript = overrideTransition;
        if (!rawScript && curatedBroadcast?.transitions && typeof transitionIndex === 'number') {
          rawScript = curatedBroadcast.transitions[transitionIndex];
        }
        if (!rawScript) {
          rawScript = await geminiService.generateTransition(currentTrack, nextTrack, weather);
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

        const prefs = preferenceService.getPreferences();
        const activeVoice = voiceResolverService.resolveVoice(
          prefs.voiceId,
          curatedBroadcast?.tracks || [nextTrack],
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
            voiceId: curatedBroadcast?.djVoice || activeVoice
          }
        );
      } catch (err) {
        console.warn('Transition speech failed:', err);
        setIsDjSpeaking(false);
        setSpokenText('');
        setShowPhase('music');
        restoreMusic();
        if (onTransitionComplete) onTransitionComplete();
      }
    },
    [duckMusic, restoreMusic, curatedBroadcast]
  );

  const stopDj = useCallback(() => {
    inworldService.stop();
    setIsDjSpeaking(false);
    setSpokenText('');
    restoreMusic();
  }, [restoreMusic]);

  return {
    isDjSpeaking,
    spokenText,
    showPhase,
    currentWeather,
    playShowIntro,
    playTransition,
    resetIntroState,
    stopDj
  };
}
