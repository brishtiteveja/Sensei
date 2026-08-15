import { useState, useCallback } from 'react';

let SpeechModule: any = null;
let useSpeechEvent: any = () => {};

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available (Expo Go) — voice input disabled
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  isAvailable: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const isAvailable = SpeechModule
    ? (() => { try { return SpeechModule.isRecognitionAvailable(); } catch { return false; } })()
    : false;

  const startListening = useCallback(async () => {
    if (!SpeechModule || !isAvailable) return;

    const { granted } = await SpeechModule.requestPermissionsAsync();
    if (!granted) return;

    setTranscript('');
    SpeechModule.start({
      lang: 'bn-BD',
      interimResults: true,
      continuous: true,
    });
    setIsListening(true);
  }, [isAvailable]);

  const stopListening = useCallback(() => {
    if (SpeechModule) SpeechModule.stop();
    setIsListening(false);
  }, []);

  if (SpeechModule) {
    useSpeechEvent('result', (event: any) => {
      const text = event.results[0]?.transcript ?? '';
      setTranscript(text);
    });

    useSpeechEvent('end', () => {
      setIsListening(false);
    });

    useSpeechEvent('error', () => {
      setIsListening(false);
    });
  }

  return {
    isListening,
    transcript,
    isAvailable,
    startListening,
    stopListening,
  };
}
