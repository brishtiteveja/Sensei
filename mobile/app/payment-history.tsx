import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/app-header';
import { Placeholder } from '@/components/placeholder';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { paymentsApi, getApiErrorMessage } from '@/api';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/i18n/i18n-context';
import type { PaymentHistoryItem, PaymentStatus } from '@/types';
import { CircleAlert, WalletCards } from 'lucide-react-native';
import { useAppTheme } from '@/theme';

const STATUS_KEYS: Record<PaymentStatus, string> = {
  success: 'paymentHistory.statusSuccess',
  failed: 'paymentHistory.statusFailed',
  pending: 'paymentHistory.statusPending',
  cancelled: 'paymentHistory.statusCancelled',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PaymentHistoryScreen() {
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t } = useI18n();
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    try {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await paymentsApi.getPaymentHistory();
      setItems(response.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusColor = (status: PaymentStatus) =>
    status === 'success'
      ? theme.success
      : status === 'failed'
        ? theme.danger
        : status === 'cancelled'
          ? theme.warning
          : theme.accent;

  return (
    <SafeAreaView
      className={isDark ? 'flex-1 bg-app-bg-dark' : 'flex-1 bg-app-bg'}
      edges={['top']}
    >
      <AppHeader title={t('paymentHistory.title')} />
      {loading ? (
        <View className="flex-1 px-5 pt-5">
          <SkeletonLoader variant="list" count={4} />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center">
          <Placeholder
            icon={CircleAlert}
            title={t('paymentHistory.loadFailed')}
            description={error}
            buttonText={t('common.retry')}
            onPress={() => void load()}
            variant="error"
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={theme.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <Placeholder
              icon={WalletCards}
              title={t('paymentHistory.emptyTitle')}
              description={t('paymentHistory.emptyBody')}
            />
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="rounded-3xl border p-4"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-space-semibold" style={{ color: theme.text }}>
                      {item.packageName}
                    </Text>
                    <Text className="mt-1 text-xs font-space" style={{ color: theme.textSoft }}>
                      {item.kind === 'ai_credit'
                        ? t('paymentHistory.kindCredit')
                        : t('paymentHistory.kindSubscription')}
                    </Text>
                    <Text className="mt-1 text-xs font-space" style={{ color: theme.textMuted }}>
                      {t('paymentHistory.amountVia', {
                        currency: item.currency,
                        amount: String(item.amount),
                        gateway: item.gateway.toUpperCase(),
                      })}
                    </Text>
                    {item.transactionId ? (
                      <Text className="mt-1 text-[11px] font-space" style={{ color: theme.textDisabled }}>
                        {t('paymentHistory.transactionId', { id: item.transactionId })}
                      </Text>
                    ) : null}
                    <Text className="mt-2 text-[11px] font-space" style={{ color: theme.textDisabled }}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${statusColor(item.status)}22` }}
                  >
                    <Text
                      className="text-[11px] font-space-semibold uppercase"
                      style={{ color: statusColor(item.status) }}
                    >
                      {t(STATUS_KEYS[item.status])}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
