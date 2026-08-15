import type { Language } from '@/i18n/translations';

export type LanguageRegion = {
  id: string;
  flag: string;
  /** Endonym — the language/country name written in that language. */
  name: string;
  nameEn: string;
  lang: Language;
};

/**
 * Single source of truth for the language/region list.
 *
 * Used by the first-run region picker (app/choose-language.tsx) and by the
 * language section in Settings (app/my-preferences.tsx) so the two can never
 * drift apart.
 */
export const LANGUAGE_REGIONS: LanguageRegion[] = [
  { id: 'bd', flag: '🇧🇩', name: 'বাংলাদেশ', nameEn: 'Bangladesh', lang: 'bn' },
  { id: 'in', flag: '🇮🇳', name: 'भारत', nameEn: 'India', lang: 'hi' },
  { id: 'cn', flag: '🇨🇳', name: '中国', nameEn: 'China', lang: 'zh' },
  { id: 'gb', flag: '🇬🇧', name: 'United Kingdom', nameEn: 'United Kingdom', lang: 'en' },
  { id: 'es', flag: '🇪🇸', name: 'España', nameEn: 'Spain', lang: 'es' },
  { id: 'idn', flag: '🇮🇩', name: 'Indonesia', nameEn: 'Indonesia', lang: 'id' },
  { id: 'my', flag: '🇲🇾', name: 'Malaysia', nameEn: 'Malaysia', lang: 'ms' },
  { id: 'ng', flag: '🇳🇬', name: 'Nigeria', nameEn: 'Nigeria', lang: 'ha' },
  { id: 'other', flag: '🌍', name: 'Other', nameEn: 'Other', lang: 'en' },
];

export type LanguageOption = {
  code: Language;
  flag: string;
  /** Language name in its own script. */
  nativeName: string;
  /** English name of the language. */
  englishName: string;
};

/**
 * One entry per bundled locale in src/i18n/ (bn, en, es, ha, hi, id, ms, zh),
 * derived from LANGUAGE_REGIONS so flags/regions stay in sync with onboarding.
 * The catch-all "other" row is not a locale, so it is excluded.
 */
const LANGUAGE_NAMES: Record<Language, { nativeName: string; englishName: string }> = {
  bn: { nativeName: 'বাংলা', englishName: 'Bangla' },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi' },
  zh: { nativeName: '中文', englishName: 'Chinese' },
  en: { nativeName: 'English', englishName: 'English' },
  es: { nativeName: 'Español', englishName: 'Spanish' },
  id: { nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  ms: { nativeName: 'Bahasa Melayu', englishName: 'Malay' },
  ha: { nativeName: 'Hausa', englishName: 'Hausa' },
};

export const LANGUAGE_OPTIONS: LanguageOption[] = LANGUAGE_REGIONS.filter(
  (region) => region.id !== 'other',
).map((region) => ({
  code: region.lang,
  flag: region.flag,
  nativeName: LANGUAGE_NAMES[region.lang].nativeName,
  englishName: LANGUAGE_NAMES[region.lang].englishName,
}));
