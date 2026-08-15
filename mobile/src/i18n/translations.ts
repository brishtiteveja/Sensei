import { bn } from '@/i18n/bn';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { ha } from '@/i18n/ha';
import { hi } from '@/i18n/hi';
import { id } from '@/i18n/id';
import { ms } from '@/i18n/ms';
import { zh } from '@/i18n/zh';

export type Language = 'en' | 'bn' | 'hi' | 'zh' | 'es' | 'id' | 'ms' | 'ha';

export type TranslationNode = string | { [key: string]: TranslationNode };
export type TranslationTree = { [key: string]: TranslationNode };
export type Translations = Record<string, TranslationTree>;

export const translations: Translations = {
  en,
  bn,
  hi,
  zh,
  es,
  id,
  ms,
  ha,
};
