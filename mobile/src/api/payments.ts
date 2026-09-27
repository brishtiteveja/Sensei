import { backendClient } from './backend-client';
import type {
  GatewayId,
  InitiatePaymentResponse,
  PaymentHistoryResponse,
  PaymentMethodsResponse,
  SubscriptionPackagesResponse,
  UserSubscriptionResponse,
  VerifyPaymentResponse,
} from '@/types/payments';
import type { AiCreditPackagesResponse } from '@/types/ai-credits';

/*
 * Served by backend/sensei/payments.py, which speaks ShikkhaDikkha's payments
 * wire format -- these calls are that app's, on Sensei's backend client.
 */

export async function getPaymentMethods(): Promise<PaymentMethodsResponse> {
  const { data } = await backendClient.get<PaymentMethodsResponse>('/payment/methods');
  return data;
}

export async function getPackages(): Promise<SubscriptionPackagesResponse> {
  const { data } = await backendClient.get<SubscriptionPackagesResponse>('/payment/packages');
  return data;
}

export async function initiatePayment(payload: {
  packageId: string;
  gateway: GatewayId;
}): Promise<InitiatePaymentResponse> {
  const { data } = await backendClient.post<InitiatePaymentResponse>(
    '/payment/initiate',
    payload,
  );
  return data;
}

export async function getCreditPackages(): Promise<AiCreditPackagesResponse> {
  const { data } = await backendClient.get<AiCreditPackagesResponse>(
    '/payment/credit-packages',
  );
  return data;
}

export async function initiateCreditPurchase(payload: {
  packageId: string;
  gateway: GatewayId;
}): Promise<InitiatePaymentResponse> {
  const { data } = await backendClient.post<InitiatePaymentResponse>(
    '/payment/credits/initiate',
    payload,
  );
  return data;
}

export async function verifyPayment(orderId: string): Promise<VerifyPaymentResponse> {
  const { data } = await backendClient.post<VerifyPaymentResponse>(
    '/payment/verify',
    { orderId },
  );
  return data;
}

export async function getSubscriptionStatus(): Promise<UserSubscriptionResponse> {
  const { data } = await backendClient.get<UserSubscriptionResponse>(
    '/payment/subscription/status',
  );
  return data;
}

export async function getPaymentHistory(): Promise<PaymentHistoryResponse> {
  const { data } = await backendClient.get<PaymentHistoryResponse>(
    '/payment/history',
  );
  return data;
}
