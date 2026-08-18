import { useCallback, useState } from 'react';

import { useI18n } from '@/i18n/i18n-context';
import { localeFor } from '@/lib/speech';

/**
 * Dictation, in whatever language the app is in.
 *
 * The module is required lazily because it is a native module: in Expo Go it
 * simply is not there, and a hard import would take the whole chat screen down
 * rather than disabling one button.
 */

let SpeechModule: any = null;
let useSpeechEvent: (event: string, handler: (e: any) => void) => void = () => {};

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module unavailable (Expo Go) — dictation stays switched off.
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
  const { language } = useI18n();

  const isAvailable = SpeechModule
    ? (() => {
        try {
          return SpeechModule.isRecognitionAvailable();
        } catch {
          return false;
        }
      })()
    : false;

  const startListening = useCallback(async () => {
    if (!SpeechModule || !isAvailable) return;

    const { granted } = await SpeechModule.requestPermissionsAsync();
    if (!granted) return;

    setTranscript('');
    SpeechModule.start({
      // Follows the app language rather than assuming Bengali, which was
      // quietly mis-recognising every other language the app ships in.
      lang: localeFor(language),
      interimResults: true,
      continuous: true,
    });
    setIsListening(true);
  }, [isAvailable, language]);

  const stopListening = useCallback(() => {
    if (SpeechModule) SpeechModule.stop();
    setIsListening(false);
  }, []);

  // Unconditional: hooks cannot live behind an `if` — these were, which is a
  // crash waiting for the first render where the module resolves differently.
  // The stub above makes them no-ops when the native module is missing.
  useSpeechEvent('result', (event: any) => {
    setTranscript(event?.results?.[0]?.transcript ?? '');
  });
  useSpeechEvent('end', () => setIsListening(false));
  useSpeechEvent('error', () => setIsListening(false));

  return {
    isListening,
    transcript,
    isAvailable,
    startListening,
    stopListening,
  };
}
