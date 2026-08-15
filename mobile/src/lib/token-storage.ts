import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenPair } from '@/types';

const ACCESS_TOKEN_KEY = '@auth/access_token';
const REFRESH_TOKEN_KEY = '@auth/refresh_token';

export async function getTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await AsyncStorage.multiGet([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);

  if (!accessToken[1] || !refreshToken[1]) return null;

  return {
    accessToken: accessToken[1],
    refreshToken: refreshToken[1],
  };
}

export async function saveTokens(tokens: TokenPair): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, tokens.accessToken],
    [REFRESH_TOKEN_KEY, tokens.refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}
