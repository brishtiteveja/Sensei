import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'guest_ai_session_id';

export async function getGuestAiSessionId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}

export async function peekGuestAiSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearGuestAiSessionId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
