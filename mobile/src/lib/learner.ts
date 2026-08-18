import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Who the tutor is teaching.
 *
 * A learner id is minted on the device and never asks anyone to sign in — the
 * students this is for are minors, and a registration wall before the first
 * question would lose most of them. The id is what the backend hangs mastery,
 * the concept graph and the root-cause diagnosis off, so the tutor can open
 * with "you had projectile motion trouble last time" rather than a blank slate.
 *
 * It is deliberately not the NestJS account id: signing in should not reset
 * what the tutor remembers, and using the tutor should not require an account.
 * If the two are ever linked, link them server-side.
 */

const ID_KEY = 'dikkha_learner_id';

/**
 * Cached so callers on hot paths (every tutor turn) can read it synchronously.
 * Hydrated once at startup; `learnerId()` still works before that resolves, it
 * just mints the id and persists in the background.
 */
let cached: string | null = null;

function mint(): string {
  return `l_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Read the stored id into memory. Call once, early. */
export async function hydrateLearner(): Promise<string> {
  if (cached) return cached;
  try {
    const saved = await AsyncStorage.getItem(ID_KEY);
    if (saved) {
      cached = saved;
      return saved;
    }
  } catch {
    /* fall through and mint a fresh one */
  }
  return learnerId();
}

/** The learner id, synchronously. Mints and persists one on first call. */
export function learnerId(): string {
  if (!cached) {
    cached = mint();
    void AsyncStorage.setItem(ID_KEY, cached).catch(() => undefined);
  }
  return cached;
}
