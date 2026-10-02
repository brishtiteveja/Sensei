import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/i18n/i18n-context';
import { useAppTheme } from '@/theme';

/**
 * Landing screen for the payment deep link
 * (`<APP_DEEP_LINK_BASE>/payment-result?status=...&orderId=...`).
 *
 * Normally openAuthSessionAsync intercepts this redirect and the
 * subscription/ai-credits screen handles the result in-place; this route
 * exists for cold starts and cases where the browser hands the link to the
 * app directly, so the user never lands on an unmatched-route screen.
 */
export default function PaymentResultScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    status?: string;
    orderId?: string;
    reason?: string;
  }>();

  const status =
    params.status === 'success' || params.status === 'failed'
      ? params.status
      : 'pending';

  const pageBg = isDark ? 'bg-app-bg-dark' : 'bg-app-bg';
  const primaryText = isDark ? 'text-app-text-dark' : 'text-app-text';
  const mutedText = isDark ? 'text-app-text-muted-dark' : 'text-app-text-muted';

  const icon =
    status === 'success' ? (
      <CheckCircle2 size={56} color={theme.success} strokeWidth={2} />
    ) : status === 'failed' ? (
      <XCircle size={56} color={theme.danger} strokeWidth={2} />
    ) : (
      <Clock3 size={56} color={theme.accentStrong} strokeWidth={2} />
    );

  return (
    <SafeAreaView className={`flex-1 ${pageBg}`} edges={['top']}>
      <AppHeader title={t('paymentResult.header')} />
      <View className="flex-1 items-center justify-center px-8 gap-4">
        {icon}
        <Text className={`font-space-bold text-xl ${primaryText}`}>
          {t(`paymentResult.${status}Title`)}
        </Text>
        <Text className={`font-space text-sm text-center ${mutedText}`}>
          {t(`paymentResult.${status}Body`)}
        </Text>
        {params.reason ? (
          <Text className={`font-space text-xs text-center ${mutedText}`}>
            {t('paymentResult.reason', { reason: params.reason })}
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={() => router.replace('/subscription')}
          className="mt-4 rounded-2xl px-6 py-3"
          style={{ backgroundColor: theme.accentStrong }}
        >
          <Text
            className="font-space-semibold text-sm"
            style={{ color: theme.textInverse }}
          >
            {t('paymentResult.back')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
