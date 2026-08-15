export type NotificationPlatform = 'ios' | 'android';
export type NotificationProvider = 'expo' | 'fcm' | 'apns';
export type ReminderMoment = 'morning' | 'afternoon' | 'evening' | 'custom';

export type AppNotificationType =
  | 'ONBOARDING_REMINDER'
  | 'DAILY_LEARNING_REMINDER'
  | 'CONTINUE_WHERE_LEFT_OFF'
  | 'QUIZ_REMINDER'
  | 'NEW_MESSAGE'
  | 'QUIZ_RESULT'
  | 'PAYMENT_SUCCESS'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'COMMENT_REPLY'
  | 'AI_CREDIT_PURCHASED'
  | 'WEEKLY_PROGRESS_SUMMARY'
  | 'SUBSCRIPTION_LOW'
  | 'SUBSCRIPTION_EXPIRING_SOON'
  | 'CREDIT_LOW'
  | 'AI_CREDIT_LOW'
  | 'PLAN_EXPIRED'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'ADMIN_ANNOUNCEMENT'
  | 'SYSTEM';

export interface RegisterPushTokenPayload {
  deviceId: string;
  platform: NotificationPlatform;
  pushToken: string;
  provider: NotificationProvider;
}

export interface RemovePushTokenPayload {
  deviceId?: string;
  pushToken?: string;
}

export interface SaveReminderPreferencePayload {
  deviceId: string;
  moment: ReminderMoment;
  hour?: number;
  minute?: number;
  timezone?: string;
  enabled?: boolean;
}

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  redirectType: string | null;
  redirectId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: AppNotification[];
  nextCursor: string | null;
  limit: number;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationSocketCountEvent {
  unreadCount: number;
}

export interface NotificationSocketNewEvent {
  notification: AppNotification;
  unreadCount: number;
}

export interface LocalReminderPreference {
  deviceId: string;
  moment: ReminderMoment;
  hour: number;
  minute: number;
  timezone: string;
  enabled: boolean;
  notificationId: string | null;
}
