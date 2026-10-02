import axios from 'axios';
import { Platform } from 'react-native';
import { learnerId } from '@/lib/learner';
import { displayName } from '@/lib/display-name';

/*
 * Sensei's own backend (backend/sensei): community, payments and AI credits.
 * Not SenseiClaw (the tutor), and not the NestJS API that apiClient points at.
 * Its routes speak ShikkhaDikkha's wire format, so the calls on top of this
 * client are that app's code apart from how the person is identified.
 *
 * There is no sign-in, so a person is their learner id. That header is an
 * identifier, not a credential -- see the notes at the top of community.py
 * and payments.py.
 */

const ENV_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

// Android emulator uses 10.0.2.2 to reach host localhost
const DEV_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

// No production fallback, for the same reason as client.ts: a guessed host
// fails in confusing ways, an empty one fails immediately and says so.
export const BACKEND_BASE_URL = ENV_BASE_URL || (__DEV__ ? DEV_BASE_URL : '');

if (!BACKEND_BASE_URL) {
  console.warn('[api] EXPO_PUBLIC_BACKEND_URL is not set. Community, payments and AI credits will not work in this build.');
}

export const backendClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

backendClient.interceptors.request.use((config) => {
  config.headers['X-Learner-Id'] = learnerId();
  const name = displayName();
  // Headers are Latin-1; names are usually Bangla.
  if (name) config.headers['X-Learner-Name'] = encodeURIComponent(name);
  return config;
});
