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
 * Accounts change this, but not as much as you would think. Once the app
 * requires a login, memory has to follow the *person* — a student who reinstalls
 * or picks up a second handset should not meet a tutor that has forgotten them,
 * which is exactly what a device-scoped id would do.
 *
 * So a signed-in learner is `u_<accountId>` and everyone else keeps the device
 * id. The subtle part is the seam: someone who has already done work anonymously
 * and then signs in must not lose it. `adoptAccount()` records the device id
 * they arrived with so the backend can merge that history into the account,
 * rather than orphaning it and starting them at zero.
 */

const ID_KEY = 'dikkha_learner_id';
/** The device id a now-signed-in student arrived with, pending a server merge. */
const ORPHAN_KEY = 'dikkha_learner_orphan';
const ACCOUNT_KEY = 'dikkha_learner_account';

/**
 * Cached so callers on hot paths (every tutor turn) can read it synchronously.
 * Hydrated once at startup; `learnerId()` still works before that resolves, it
 * just mints the id and persists in the background.
 */
let cached: string | null = null;
/** Set once signed in; takes precedence over the device id. */
let account: string | null = null;

function mint(): string {
  return `l_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Read the stored id into memory. Call once, early. */
export async function hydrateLearner(): Promise<string> {
  try {
    const savedAccount = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (savedAccount) account = savedAccount;
  } catch {
    /* fall through to the device id */
  }
  if (cached) return learnerId();
  try {
    const saved = await AsyncStorage.getItem(ID_KEY);
    if (saved) {
      cached = saved;
      return learnerId();
    }
  } catch {
    /* fall through and mint a fresh one */
  }
  return learnerId();
}

/** The learner id, synchronously. Mints and persists one on first call. */
export function learnerId(): string {
  if (account) return `u_${account}`;
  if (!cached) {
    cached = mint();
    void AsyncStorage.setItem(ID_KEY, cached).catch(() => undefined);
  }
  return cached;
}

/**
 * Bind the tutor's memory to an account at sign-in.
 *
 * Returns the device id that was in use beforehand when there is work to carry
 * over, so the caller can ask the backend to merge it. Returns null when the
 * student has done nothing yet, or when this device has already been merged
 * into this account — merging twice would double-count their mastery.
 */
export async function adoptAccount(accountId: string): Promise<string | null> {
  const previous = cached ?? (await AsyncStorage.getItem(ID_KEY));
  account = accountId;
  await AsyncStorage.setItem(ACCOUNT_KEY, accountId).catch(() => undefined);

  if (!previous || previous === `u_${accountId}`) return null;

  const alreadyMerged = await AsyncStorage.getItem(ORPHAN_KEY).catch(() => null);
  if (alreadyMerged === `${accountId}:${previous}`) return null;

  await AsyncStorage.setItem(ORPHAN_KEY, `${accountId}:${previous}`).catch(() => undefined);
  return previous;
}

/**
 * Sign-out returns the tutor to the device id rather than minting a fresh one,
 * so a shared handset does not accumulate empty learners — and so signing back
 * in lands on the same account id anyway.
 */
export async function releaseAccount(): Promise<void> {
  account = null;
  await AsyncStorage.removeItem(ACCOUNT_KEY).catch(() => undefined);
}
