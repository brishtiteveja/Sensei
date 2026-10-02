import type { GatewayOption } from './payments';

export type AiCreditScope = 'guest' | 'user';
export type AiCreditFeature = 'ai_chat' | 'ask_ai';

export interface AiCreditBalance {
  scope: AiCreditScope;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  loginBonusGranted?: boolean;
}

export interface AiCreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  displayPrice: string;
  description: string;
  popular: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface AiCreditPackagesResponse {
  currency: string;
  packages: AiCreditPackage[];
  gateways: GatewayOption[];
}

/**
 * Flat, as the server sends it (this used to claim a nested `balance`, which
 * neither backend ever returned). SUBSCRIPTION_ACTIVE means nothing was spent,
 * so there is no transaction to refund.
 */
export type AiCreditConsumeResponse = AiCreditBalance &
  (
    | { code: 'CREDIT_CONSUMED'; transactionId: string }
    | { code: 'SUBSCRIPTION_ACTIVE'; transactionId: null }
  );

export type AiCreditRefundResponse = AiCreditBalance & {
  code: 'CREDIT_REFUNDED';
  transactionId: string;
};

export interface GuestAiMessageResponse {
  text: string;
  balance: AiCreditBalance;
}
