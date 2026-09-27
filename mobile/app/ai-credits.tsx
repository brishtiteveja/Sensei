import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SkeletonLoader } from '@/components/skeleton-loader';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Check, Sparkles, X, Zap } from 'lucide-react-native';
import { AppHeader } from '@/components/app-header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiErrorMessage, paymentsApi } from '@/api';
import { useI18n } from '@/i18n/i18n-context';
import type { AiCreditPackage, GatewayId, GatewayOption } from '@/types';
import { showAppToast } from '@/feedback/toast';
import { useAppTheme } from '@/theme';
import { BrandColors } from '@/constants/brands';

function gatewayColors(id: GatewayId) {
  switch (id) {
    case 'bkash':
      return BrandColors.bkash;
    case 'nagad':
      return BrandColors.nagad;
  }
}

export default function AiCreditsScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const [packages, setPackages] = useState<AiCreditPackage[]>([]);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gatewayModalVisible, setGatewayModalVisible] = useState(false);
  const [initiating, setInitiating] = useState<GatewayId | null>(null);
  const [result, setResult] = useState<'success' | 'pending' | 'failed' | null>(
    null,
  );
  const pulse = useRef(new Animated.Value(1)).current;
  const redirectUrl = Linking.createURL('/payment-result');

  useEffect(() => {
    let cancelled = false;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    async function load() {
      try {
        const response = await paymentsApi.getCreditPackages();
        if (cancelled) return;
        setPackages(response.packages);
        setGateways(response.gateways.filter((gateway) => gateway.enabled));
        const selected =
          response.packages.find((pkg) => pkg.popular) ?? response.packages[0];
        setSelectedId(selected?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          showAppToast({
            type: 'error',
            title: t('common.error'),
            message: getApiErrorMessage(error),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pulse, t]);

  const selectedPackage = packages.find((pkg) => pkg.id === selectedId) ?? null;

  const handleGateway = useCallback(
    async (gateway: GatewayOption) => {
      if (!selectedPackage || !gateway.enabled) return;
      setInitiating(gateway.id);
      setGatewayModalVisible(false);

      try {
        const payment = await paymentsApi.initiateCreditPurchase({
          packageId: selectedPackage.id,
          gateway: gateway.id,
        });
        const browserResult = await WebBrowser.openAuthSessionAsync(
          payment.checkoutURL,
          redirectUrl,
        );
        const verification = await paymentsApi.verifyPayment(payment.orderId);

        if (verification.status === 'success') {
          setResult('success');
        } else if (verification.status === 'pending') {
          setResult('pending');
        } else if (
          browserResult.type === 'success' &&
          browserResult.url.includes('status=success')
        ) {
          setResult('pending');
        } else {
          setResult('failed');
        }
      } catch (error) {
        showAppToast({
          type: 'error',
          title: t('aiCredits.failed'),
          message: getApiErrorMessage(error),
        });
      } finally {
        setInitiating(null);
      }
    },
    [redirectUrl, selectedPackage, t],
  );

  return (
    <SafeAreaView
      className={`flex-1 ${'bg-app-bg dark:bg-app-bg-dark'}`}
      edges={['top']}
    >
      <AppHeader title={t('aiCredits.title')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View
          style={{
            paddingTop: 16,
            paddingBottom: 18,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            backgroundColor: theme.accentStrong,
          }}
        >
          <View className="flex-row items-center gap-3">
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <View className="w-10 h-10 rounded-xl bg-white/15 items-center justify-center">
                <Sparkles size={21} color={theme.textInverse} />
              </View>
            </Animated.View>
            <View className="flex-1">
              <Text className="font-space-bold text-white text-lg">
                {t('aiCredits.title')}
              </Text>
              <Text className="font-space text-xs text-white/70">
                {t('aiCredits.subtitle')}
              </Text>
            </View>
          </View>
        </View>

        {result ? (
          <View
            className="mx-4 mt-4 rounded-2xl px-4 py-3 flex-row items-center gap-3 border"
            style={{
              backgroundColor: result === 'success' ? theme.successBg : theme.warningBg,
              borderColor: result === 'success' ? theme.success : theme.warning,
            }}
          >
            <Check
              size={18}
              color={result === 'success' ? theme.success : theme.warning}
            />
            <Text className="font-space-semibold text-sm" style={{ color: result === 'success' ? theme.successText : theme.warningText }}>
              {result === 'success'
                ? t('aiCredits.added')
                : result === 'pending'
                  ? t('aiCredits.pending')
                  : t('aiCredits.failed')}
            </Text>
          </View>
        ) : null}

        <Text className="font-space-semibold text-sm mx-4 mt-5 mb-3" style={{ color: theme.textMuted }}>
          {t('aiCredits.choosePackage')}
        </Text>

        {loading ? (
          <View className="mx-4">
            <SkeletonLoader variant="card" count={3} />
          </View>
        ) : (
          <View className="mx-4 gap-3">
            {packages.map((pkg) => {
              const selected = pkg.id === selectedId;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => setSelectedId(pkg.id)}
                  activeOpacity={0.8}
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: selected ? theme.accentSoft : theme.surface,
                    borderColor: selected ? theme.accent : theme.border,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: theme.accentSoft }}>
                        <Zap size={19} color={theme.accent} />
                      </View>
                      <View>
                        <Text
                          className={`font-space-bold text-base ${
                            'text-app-text dark:text-app-text-dark'
                          }`}
                        >
                          {pkg.name}
                        </Text>
                        <Text className="font-space text-xs" style={{ color: theme.textMuted }}>
                          {t('aiCredits.credits', { count: String(pkg.credits) })}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-space-bold text-lg" style={{ color: theme.accent }}>
                      {pkg.displayPrice}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View className="mx-4 mt-5">
          <TouchableOpacity
            activeOpacity={selectedPackage ? 0.85 : 1}
            disabled={!selectedPackage || loading || !!initiating}
            onPress={() => setGatewayModalVisible(true)}
          >
            <View
              style={{
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: 'center',
                backgroundColor: selectedPackage ? theme.accentStrong : theme.accentDisabled,
              }}
            >
              {initiating ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <Text className="font-space-bold text-white text-base">
                  {t('aiCredits.continue')}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomSheet visible={gatewayModalVisible} onClose={() => setGatewayModalVisible(false)} animationType="fade" backdropDismiss={false} contentBackgroundColor={theme.page}>
          <View
            className={`rounded-t-[24px] px-5 pt-5 pb-8 ${
              'bg-app-bg dark:bg-app-bg-dark'
            }`}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className={`font-space-bold text-lg ${
                  'text-app-text dark:text-app-text-dark'
                }`}
              >
                {t('aiCredits.selectMethod')}
              </Text>
              <TouchableOpacity
                onPress={() => setGatewayModalVisible(false)}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.surfaceAlt }}
              >
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {gateways.map((gateway) => {
              const colors = gatewayColors(gateway.id);
              return (
                <TouchableOpacity
                  key={gateway.id}
                  activeOpacity={0.8}
                  onPress={() => void handleGateway(gateway)}
                  className="flex-row items-center gap-3 rounded-2xl px-4 py-3 mb-3 border"
                  style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                >
                  <View
                    style={{ backgroundColor: colors.bg }}
                    className="w-11 h-11 rounded-xl items-center justify-center"
                  >
                    <Text
                      className="font-space-bold text-base"
                      style={{ color: colors.fg }}
                    >
                      {gateway.logoText}
                    </Text>
                  </View>
                  <Text
                    className={`font-space-semibold text-base ${
                      'text-app-text dark:text-app-text-dark'
                    }`}
                  >
                    {gateway.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
