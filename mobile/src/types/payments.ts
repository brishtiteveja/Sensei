export type GatewayId = 'bkash' | 'nagad';

export type UserSubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface SubscriptionPackage {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  displayPrice: string;
  period: string;
  save: string;
  popular: boolean;
}

export interface GatewayOption {
  id: GatewayId;
  name: string;
  logoText: string;
  enabled: boolean;
  comingSoon: boolean;
}

export interface SubscriptionPackagesResponse {
  currency: string;
  packages: SubscriptionPackage[];
  gateways: GatewayOption[];
}

export interface PaymentMethodsResponse {
  methods: GatewayOption[];
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export interface InitiatePaymentResponse {
  orderId: string;
  gateway: GatewayId;
  checkoutURL: string;
  amount: number;
  currency: string;
  packageName: string;
  status: PaymentStatus;
}

export interface ActiveSubscription {
  id: string;
  packageName: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: UserSubscriptionStatus;
  daysRemaining: number;
}

export interface UserSubscriptionResponse {
  isActive: boolean;
  subscription: ActiveSubscription | null;
}

export interface VerifyPaymentResponse {
  orderId: string;
  status: PaymentStatus;
  gateway: GatewayId;
  amount: number;
  currency: string;
  transactionId: string | null;
  packageName: string;
  subscription: ActiveSubscription | null;
}

export type PaymentHistoryKind = 'subscription' | 'ai_credit';

export interface PaymentHistoryItem {
  id: string;
  status: PaymentStatus;
  gateway: GatewayId;
  amount: number;
  currency: string;
  transactionId: string | null;
  packageName: string;
  kind: PaymentHistoryKind;
  createdAt: string;
  reviewedAt: string | null;
}

export interface PaymentHistoryResponse {
  items: PaymentHistoryItem[];
}
