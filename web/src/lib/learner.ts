import { readRaw, writeRaw, readJSON, writeJSON } from '@/lib/storage';

/**
 * Who is using this browser.
 *
 * A full sign-in is more than a student needs to start, and more than we should
 * ask of a minor: the id is generated locally and only becomes meaningful once
 * they tell us their name. That id is what the server keys memory on, so the
 * tutor recognises them across sessions on this device — and, once accounts are
 * real, across devices without changing anything here.
 */

const ID_KEY = 'learner.id';
const PROFILE_KEY = 'learner.profile';

export interface LocalProfile {
  name?: string;
  language?: string;
  exam?: string;
  exam_date?: string;
  /** Set once the profile has been pushed, so we do not re-announce on boot. */
  synced?: boolean;
}

export function learnerId(): string {
  let id = readRaw(ID_KEY);
  if (!id) {
    id = `l_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    writeRaw(ID_KEY, id);
  }
  return id;
}

export function localProfile(): LocalProfile {
  return readJSON<LocalProfile>(PROFILE_KEY, {});
}

export function saveLocalProfile(p: LocalProfile): void {
  writeJSON(PROFILE_KEY, { ...localProfile(), ...p });
}

/** True once the student has told us who they are. */
export function hasIdentity(): boolean {
  return Boolean(localProfile().name?.trim());
}
