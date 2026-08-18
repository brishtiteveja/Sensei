import * as Speech from 'expo-speech';

import type { Language } from '@/i18n/translations';

/**
 * Speech, on the device.
 *
 * Both directions run through the operating system's own engines: dictation via
 * expo-speech-recognition, reading aloud via expo-speech. Nothing is uploaded,
 * which is the point — a child reading their homework aloud is exactly the kind
 * of audio that should never leave the handset, and it keeps the "runs on your
 * own hardware" claim true of the whole product rather than most of it. It also
 * works with no signal, which for the students this is built for is not a
 * detail.
 *
 * The trade is voice quality and coverage: OS voices are serviceable rather
 * than lifelike, and which languages exist depends on the handset. `speak()`
 * degrades to the closest thing installed rather than failing.
 */

/** App language to BCP-47, for both recognisers and voices. */
const LOCALES: Record<Language, string> = {
  en: 'en-US',
  bn: 'bn-BD',
  hi: 'hi-IN',
  es: 'es-ES',
  id: 'id-ID',
  ms: 'ms-MY',
  ha: 'ha-NG',
  zh: 'zh-CN',
};

export function localeFor(language: string): string {
  return LOCALES[language as Language] ?? 'en-US';
}

/**
 * Strip what should not be read out.
 *
 * A tutor reply is Markdown with LaTeX in it, and a voice that says "dollar v
 * backslash sin" is worse than no voice at all. Formulae are spoken as "the
 * formula" — a placeholder the student can look at on screen — which is honest
 * about what speech can carry.
 */
export function speakable(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' the formula on screen ')
    .replace(/\$[^$\n]+\$/g, ' the formula ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SpeakHandlers {
  onDone?: () => void;
  onError?: () => void;
}

/** Read text aloud, replacing whatever was already being read. */
export function speak(text: string, language: string, handlers: SpeakHandlers = {}): void {
  const body = speakable(text);
  if (!body) {
    handlers.onDone?.();
    return;
  }
  // Two voices talking over each other is the worst failure here, so a new
  // request always silences the old one first.
  Speech.stop();
  Speech.speak(body, {
    language: localeFor(language),
    // A touch under natural pace: this is a tutor explaining, and the listener
    // may not be hearing the subject in their first language.
    rate: 0.95,
    onDone: handlers.onDone,
    onStopped: handlers.onDone,
    onError: handlers.onError ?? handlers.onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
