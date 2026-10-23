/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState } from '../types';

interface VoiceEngineOptions {
  onTranscript: (text: string) => void;
  onStateChange: (state: AssistantState) => void;
  wakeWordEnabled: boolean;
}

export function useVoiceEngine({ onTranscript, onStateChange, wakeWordEnabled }: VoiceEngineOptions) {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioEnergy, setAudioEnergy] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);

  // 1. Populate voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Prioritize natural British or composed voices for JARVIS
      const preferred = voices.find(
        (v) =>
          (v.lang.includes('en-GB') || v.lang.includes('en_GB')) &&
          (v.name.includes('Oliver') || v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('Male'))
      ) || voices.find((v) => v.lang.includes('en-GB')) || voices.find((v) => v.lang.includes('en-US'));

      if (preferred && !selectedVoiceName) {
        setSelectedVoiceName(preferred.name);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [selectedVoiceName]);

  // 2. Speak response
  const speak = useCallback(
    (text: string) => {
      if (isMuted || !('speechSynthesis' in window) || !text) return;

      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      onStateChange('speaking');

      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoiceName) {
        const voice = availableVoices.find((v) => v.name === selectedVoiceName);
        if (voice) utterance.voice = voice;
      }
      utterance.rate = speechRate;
      utterance.pitch = 0.95;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        onStateChange('idle');
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        onStateChange('idle');
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, selectedVoiceName, availableVoices, speechRate, onStateChange]
  );

  // 3. Stop speaking immediately
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    onStateChange('idle');
  }, [onStateChange]);

  // 4. Speech Recognition (Push-to-Talk)
  const startListening = useCallback(() => {
    stopSpeech();

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API is not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isListeningRef.current = true;
        onStateChange('listening');
        setAudioEnergy(0.8);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          onTranscript(transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        isListeningRef.current = false;
        onStateChange('idle');
        setAudioEnergy(0);
      };

      rec.onend = () => {
        isListeningRef.current = false;
        setAudioEnergy(0);
        // Let the processing state handle transition if transcript submitted
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      isListeningRef.current = false;
      onStateChange('idle');
    }
  }, [stopSpeech, onStateChange, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
    onStateChange('idle');
    setAudioEnergy(0);
  }, [onStateChange]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // 5. Wake word background listener
  useEffect(() => {
    if (!wakeWordEnabled) {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch {}
        wakeWordRecognitionRef.current = null;
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    let active = true;

    const setupWakeWord = () => {
      if (!active) return;
      const wwRec = new SpeechRec();
      wwRec.lang = 'en-US';
      wwRec.continuous = true;
      wwRec.interimResults = true;

      wwRec.onresult = (e: any) => {
        const last = e.results[e.results.length - 1];
        const text = (last[0]?.transcript || '').toLowerCase();

        if (text.includes('hey jarvis') || text.includes('jarvis')) {
          wwRec.stop();
          startListening();
        }
      };

      wwRec.onerror = () => {
        if (active && wakeWordEnabled) {
          setTimeout(setupWakeWord, 2000);
        }
      };

      wwRec.onend = () => {
        if (active && wakeWordEnabled && !isListeningRef.current) {
          setTimeout(setupWakeWord, 1000);
        }
      };

      wakeWordRecognitionRef.current = wwRec;
      try {
        wwRec.start();
      } catch {}
    };

    setupWakeWord();

    return () => {
      active = false;
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch {}
      }
    };
  }, [wakeWordEnabled, startListening]);

  return {
    speak,
    stopSpeech,
    startListening,
    stopListening,
    toggleListening,
    availableVoices,
    selectedVoiceName,
    setSelectedVoiceName,
    speechRate,
    setSpeechRate,
    isMuted,
    setIsMuted,
    audioEnergy,
  };
}
