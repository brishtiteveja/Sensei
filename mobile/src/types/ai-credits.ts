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

export interface AiCreditConsumeResponse {
  code: 'CREDIT_CONSUMED';
  transactionId: string;
  balance: AiCreditBalance;
}

export interface GuestAiMessageResponse {
  text: string;
  balance: AiCreditBalance;
}
