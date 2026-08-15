import type { UserPreferences } from './preferences';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface User extends UserPreferences {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export interface ApiErrorResponse {
  message: string | string[];
  statusCode: number;
  error?: string;
}
