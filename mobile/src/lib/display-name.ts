import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The name a student gave the tutor during onboarding.
 *
 * There is no account to read a name from, so this is what other students see
 * on a shared community post. Cached like the learner id so the community
 * client can attach it to a request synchronously.
 */

const KEY = 'dikkha_display_name';

let cached: string | null = null;

export async function hydrateDisplayName(): Promise<string | null> {
  try {
    cached = (await AsyncStorage.getItem(KEY)) || null;
  } catch {
    /* no name yet */
  }
  return cached;
}

export function displayName(): string | null {
  return cached;
}

export async function setDisplayName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return;
  cached = trimmed;
  await AsyncStorage.setItem(KEY, trimmed).catch(() => undefined);
}
