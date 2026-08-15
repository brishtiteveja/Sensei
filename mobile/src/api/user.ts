import { apiClient } from './client';
import type { User } from '@/types';
import type { UpdatePreferencesPayload, UserPreferences } from '@/types/preferences';

export interface UpdateProfilePayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
}

export async function getMyProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/me');
  return data;
}

export async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  const { data } = await apiClient.patch<User>('/users/me', payload);
  return data;
}

export async function updateMyAvatar(fileUri: string): Promise<User> {
  const formData = new FormData();
  const extension = fileUri.split('.').pop()?.toLowerCase();
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  formData.append('file', {
    uri: fileUri,
    name: `avatar-${Date.now()}.${extension || 'jpg'}`,
    type: mimeType,
  } as any);

  const { data } = await apiClient.patch<User>(
    '/users/me/avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return data;
}

export async function updateMyPreferences(
  payload: UpdatePreferencesPayload,
): Promise<User> {
  const { data } = await apiClient.patch<User>('/users/me/preferences', payload);
  return data;
}

export async function getMyPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get<UserPreferences>('/users/me/preferences');
  return data;
}
