import type { ThemeName, ThemeDefinition } from '../tokens';
import quantumIndigo from './quantum-indigo';
import auroraViolet from './aurora-violet';
import focusEmerald from './focus-emerald';

export const themes: Record<ThemeName, ThemeDefinition> = {
  'quantum-indigo': quantumIndigo,
  'aurora-violet': auroraViolet,
  'focus-emerald': focusEmerald,
};
