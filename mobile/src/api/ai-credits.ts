import { apiClient } from './client';
import type {
  AiCreditBalance,
  AiCreditConsumeResponse,
  AiCreditFeature,
  AiCreditPackage,
} from '@/types/ai-credits';

export async function getUserBalance(): Promise<AiCreditBalance> {
  const { data } = await apiClient.get<AiCreditBalance>('/ai/credits/balance');
  return data;
}

export async function getGuestBalance(
  sessionId: string,
): Promise<AiCreditBalance> {
  const { data } = await apiClient.post<AiCreditBalance>(
    '/ai/credits/guest/balance',
    { sessionId },
  );
  return data;
}

export async function consumeUserCredit(payload: {
  feature: AiCreditFeature;
  cost?: number;
}): Promise<AiCreditConsumeResponse> {
  const { data } = await apiClient.post<AiCreditConsumeResponse>(
    '/ai/credits/consume',
    payload,
  );
  return data;
}

export async function getPackages(): Promise<AiCreditPackage[]> {
  const { data } = await apiClient.get<AiCreditPackage[]>(
    '/ai/credits/packages',
  );
  return data;
}

export async function claimGuestCredits(
  sessionId: string,
): Promise<AiCreditBalance> {
  const { data } = await apiClient.post<AiCreditBalance>(
    '/ai/credits/claim-guest',
    { sessionId },
  );
  return data;
}
