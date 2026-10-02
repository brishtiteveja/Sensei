import axios from 'axios';
import { backendClient } from './backend-client';
import type {
  AiCreditBalance,
  AiCreditConsumeResponse,
  AiCreditFeature,
  AiCreditPackage,
  AiCreditRefundResponse,
} from '@/types/ai-credits';

/*
 * The learner's AI-credit wallet, on backend/sensei/payments.py. One wallet per
 * learner id: without sign-in there is no separate guest wallet to claim from,
 * so ShikkhaDikkha's guest and login-bonus calls are gone.
 */

export async function getUserBalance(): Promise<AiCreditBalance> {
  const { data } = await backendClient.get<AiCreditBalance>('/ai/credits/balance');
  return data;
}

export async function consumeUserCredit(payload: {
  feature: AiCreditFeature;
  cost?: number;
}): Promise<AiCreditConsumeResponse> {
  const { data } = await backendClient.post<AiCreditConsumeResponse>(
    '/ai/credits/consume',
    payload,
  );
  return data;
}

/** Give back a credit spent on a turn the tutor failed to answer. */
export async function refundUserCredit(transactionId: string): Promise<AiCreditRefundResponse> {
  const { data } = await backendClient.post<AiCreditRefundResponse>(
    '/ai/credits/refund',
    { transactionId },
  );
  return data;
}

export async function getPackages(): Promise<AiCreditPackage[]> {
  const { data } = await backendClient.get<AiCreditPackage[]>(
    '/ai/credits/packages',
  );
  return data;
}

/** True when the wallet is empty -- as opposed to the server being unreachable. */
export function isOutOfCredits(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 402;
}
