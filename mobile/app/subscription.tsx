import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AppHeader } from '@/components/app-header';
import { ArrowLeft, Check, Crown, Sparkles, X, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/brands';
import { useI18n } from '@/i18n/i18n-context';
import { useTheme } from '@/contexts/theme-context';
import { getApiErrorMessage, paymentsApi } from '@/api';
import type { ActiveSubscription, GatewayId, GatewayOption, SubscriptionPackage } from '@/types';
import { showAppToast } from '@/feedback/toast';
import { useAppTheme } from '@/theme';

/*
 * ShikkhaDikkha's subscription screen. The one structural change: there is no
 * sign-in, so nothing is gated on it -- a learner always has an id to buy
 * under (see backend/sensei/payments.py for what that means for a purchase).
 */

function getGatewayColors(id: GatewayId) {
  switch (id) {
    case 'bkash':  return BrandColors.bkash;
    case 'nagad':  return BrandColors.nagad;
  }
}

const supportedGatewayIds: GatewayId[] = ['bkash', 'nagad'];

type PaymentResult = 'success' | 'failed' | 'pending' | null;

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const { t } = useI18n();
  const pageBg = isDark ? 'bg-app-bg-dark' : 'bg-app-bg';
  const surfaceBg = isDark ? 'bg-app-surface-dark' : 'bg-app-surface';
  const primaryText = isDark ? 'text-app-text-dark' : 'text-app-text';
  const mutedText = isDark ? 'text-app-text-muted-dark' : 'text-app-text-muted';
  const premiumPerks = [
    t('subscription.perkUnlimitedAi'),
    t('subscription.perkStepByStep'),
    t('subscription.perkPremiumSets'),
    t('subscription.perkAdFree'),
    t('subscription.perkPrioritySupport'),
  ];

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGatewayModalVisible, setIsGatewayModalVisible] = useState(false);
  const [isInitiating, setIsInitiating] = useState<GatewayId | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult>(null);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);

  const crownAnim = useRef(new Animated.Value(0)).current;
  const redirectUrl = Linking.createURL('/payment-result');

  useEffect(() => {
    let cancelled = false;

    Animated.loop(
      Animated.sequence([
        Animated.timing(crownAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(crownAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ]),
    ).start();

    async function load() {
      try {
        const pkgRes = await paymentsApi.getPackages();
        if (cancelled) return;
        setPackages(pkgRes.packages);
        setGateways(pkgRes.gateways.filter((gateway) => supportedGatewayIds.includes(gateway.id)));
        const popular = pkgRes.packages.find((p) => p.popular) ?? pkgRes.packages[0];
        if (popular) setSelectedId(popular.id);
      } catch (err) {
        if (!cancelled) {
          showAppToast({
            type: 'error',
            title: t('common.error'),
            message: getApiErrorMessage(err),
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    async function loadSubscriptionStatus() {
      try {
        const subRes = await paymentsApi.getSubscriptionStatus();
        if (cancelled) return;
        setActiveSub(subRes.isActive && subRes.subscription ? subRes.subscription : null);
      } catch {
        if (!cancelled) setActiveSub(null);
      }
    }

    load();
    loadSubscriptionStatus();
    return () => { cancelled = true; };
  }, [crownAnim, t]);

  const crownRotate = crownAnim.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });
  const selectedPackage = packages.find((p) => p.id === selectedId) ?? null;

  const handleSelectGateway = useCallback(async (gateway: GatewayOption) => {
    if (!gateway.enabled || !selectedPackage) return;
    setIsInitiating(gateway.id);
    setIsGatewayModalVisible(false);

    try {
      const result = await paymentsApi.initiatePayment({ packageId: selectedPackage.id, gateway: gateway.id });
      const browserResult = await WebBrowser.openAuthSessionAsync(result.checkoutURL, redirectUrl);
      // The server asks the gateway itself, so this settles the payment even
      // when the callback never reached it.
      const verification = await paymentsApi.verifyPayment(result.orderId);

      if (verification.status === 'success') {
        setPaymentResult('success');
        const subRes = await paymentsApi.getSubscriptionStatus();
        if (subRes.isActive && subRes.subscription) setActiveSub(subRes.subscription);
      } else if (verification.status === 'pending') {
        setPaymentResult('pending');
      } else if (browserResult.type === 'success' && browserResult.url.includes('status=success')) {
        // The callback beat verify to it; the next status check will settle.
        setPaymentResult('pending');
      } else {
        setPaymentResult('failed');
      }
    } catch (err) {
      showAppToast({
        type: 'error',
        title: t('subscription.paymentFailed'),
        message: getApiErrorMessage(err),
      });
    } finally {
      setIsInitiating(null);
    }
  }, [selectedPackage, redirectUrl, t]);

  return (
    <SafeAreaView className={`flex-1 ${pageBg}`} edges={['top']}>
      <AppHeader title={t('subscription.title')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        <View
          style={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: theme.accentStrong }}
        >
          <View className="flex-row items-center gap-3">
            <Animated.View style={{ transform: [{ rotate: crownRotate }] }}>
              <View
                style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accentStrong }}
              >
                <Crown size={20} color={theme.textInverse} strokeWidth={2} />
              </View>
            </Animated.View>

            <View>
              <Text className="font-space-bold text-white text-lg" style={{ letterSpacing: -0.3 }}>{t('subscription.title')}</Text>
              <Text className="font-space text-xs" style={{ color: theme.whiteOverlayStrong }}>{t('subscription.subtitle')}</Text>
            </View>
          </View>
        </View>

        {/* ─── Active subscription banner ─── */}
        {activeSub && (
          <View
            className="mx-4 mt-4 rounded-2xl px-4 py-3 flex-row items-center gap-3 border"
            style={{ backgroundColor: theme.successBg, borderColor: theme.success }}
          >
            <Check size={18} color={theme.success} strokeWidth={2.5} />
            <View>
              <Text className="font-space-semibold text-sm" style={{ color: theme.successText }}>
                {t('subscription.active', { name: activeSub.packageName })}
              </Text>
              <Text className="font-space text-xs" style={{ color: theme.success }}>
                {t('subscription.expires', {
                  days: String(activeSub.daysRemaining),
                  date: new Date(activeSub.endDate).toLocaleDateString('en-BD'),
                })}
              </Text>
            </View>
          </View>
        )}

        {/* ─── Perks list ─── */}
        <View className={`mx-4 mt-4 rounded-2xl px-4 py-4 ${surfaceBg}`}
          style={{ shadowColor: theme.shadow, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        >
          {premiumPerks.map((perk) => (
            <View key={perk} className="flex-row items-center gap-3 py-2">
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={12} color={theme.accent} strokeWidth={2.5} />
              </View>
              <Text className="font-space text-sm" style={{ color: theme.textSoft }}>{perk}</Text>
            </View>
          ))}
        </View>

        {/* ─── Package grid ─── */}
        <Text className="font-space-semibold text-sm mx-4 mt-5 mb-3" style={{ color: theme.textMuted }}>
          {t('subscription.choosePlan')}
        </Text>

        {isLoading ? (
          <View className="mx-4">
            <SkeletonLoader variant="grid" count={4} />
          </View>
        ) : (
          <View className="mx-4 flex-row flex-wrap gap-3">
            {packages.map((pkg) => {
              const isSelected = selectedId === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => setSelectedId(pkg.id)}
                  activeOpacity={0.8}
                  style={{
                    width: '47.5%',
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: isSelected ? theme.accent : (isDark ? theme.borderStrong : theme.border),
                    backgroundColor: isSelected ? theme.accentSoft : theme.surface,
                    padding: 16,
                    position: 'relative',
                    shadowColor: theme.shadow,
                    shadowOpacity: isSelected ? 0.12 : 0.04,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: isSelected ? 4 : 1,
                  }}
                >
                  {/* Badge */}
                  {(pkg.popular || pkg.save) && (
                    <View style={{
                      position: 'absolute', top: -10, right: 12,
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                      backgroundColor: pkg.popular ? theme.accentStrong : theme.success,
                    }}>
                      <Text className="font-space-bold text-white" style={{ fontSize: 10 }}>
                        {pkg.popular ? t('subscription.popular') : pkg.save}
                      </Text>
                    </View>
                  )}

                  {/* Selected check */}
                  {isSelected && (
                    <View style={{ position: 'absolute', top: 10, left: 12, width: 18, height: 18, borderRadius: 9, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} color={theme.textInverse} strokeWidth={3} />
                    </View>
                  )}

                  <Text className={`font-space-bold text-2xl mt-4 ${!isSelected ? primaryText : ''}`} style={isSelected ? { color: theme.accent } : undefined}>
                    {pkg.displayPrice}
                  </Text>
                  <Text className="font-space-semibold text-sm mt-0.5" style={{ color: theme.textSoft }}>
                    {pkg.name}
                  </Text>
                  <Text className={`font-space text-xs mt-0.5 ${mutedText}`}>
                    {pkg.period}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── CTA ─── */}
        <View className="mx-4 mt-5">
          <TouchableOpacity
            onPress={() => {
              if (!selectedPackage) return;
              setIsGatewayModalVisible(true);
            }}
            disabled={isLoading || isInitiating !== null || !selectedPackage}
            activeOpacity={0.88}
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
              opacity: (isLoading || !selectedPackage) ? 0.6 : 1,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, backgroundColor: theme.accentStrong }}
            >
              {isInitiating ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <Sparkles size={20} color={theme.textInverse} strokeWidth={2} />
              )}
              <Text className="font-space-bold text-white text-base" style={{ letterSpacing: 0.2 }}>
                {isInitiating
                  ? t('subscription.openingPayment', { name: gateways.find((g) => g.id === isInitiating)?.name ?? '' })
                  : selectedPackage
                    ? t('subscription.subscribeWithPrice', { price: selectedPackage.displayPrice })
                    : t('subscription.subscribeNow')}
              </Text>
            </View>
          </TouchableOpacity>

          <Text className={`font-space text-xs text-center mt-2 ${mutedText}`}>
            {t('subscription.securePayment')}
          </Text>
        </View>

      </ScrollView>

      {/* ─── Gateway bottom sheet ─── */}
      <BottomSheet visible={isGatewayModalVisible} onClose={() => setIsGatewayModalVisible(false)} contentBackgroundColor={theme.surface}>
          <View className={`rounded-t-[28px] px-5 pt-5 pb-8 ${surfaceBg}`}>

            <View className="flex-row items-center justify-between mb-1">
              <Text className={`font-space-bold text-lg ${primaryText}`}>{t('subscription.payWith')}</Text>
              <TouchableOpacity onPress={() => setIsGatewayModalVisible(false)} activeOpacity={0.7}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <Text className="font-space text-sm mb-5" style={{ color: theme.textMuted }}>
              {selectedPackage?.name} · {selectedPackage?.displayPrice}
            </Text>

            {gateways.map((gw) => {
              const colors = getGatewayColors(gw.id);
              const isGwLoading = isInitiating === gw.id;
              return (
                <TouchableOpacity
                  key={gw.id}
                  onPress={() => gw.enabled && handleSelectGateway(gw)}
                  disabled={!gw.enabled || isGwLoading}
                  activeOpacity={gw.enabled ? 0.8 : 1}
                  style={{ opacity: gw.enabled ? 1 : 0.4, borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
                  className="flex-row items-center gap-3 rounded-2xl px-4 py-4 mb-3 border"
                >
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.fg }} className="font-space-bold text-sm">{gw.logoText}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className={`font-space-semibold text-base ${primaryText}`}>{gw.name}</Text>
                      {gw.comingSoon && (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: theme.surfaceAlt }}>
                          <Text className="font-space text-[10px]" style={{ color: theme.textMuted }}>{t('subscription.soon')}</Text>
                        </View>
                      )}
                    </View>
                    {gw.enabled && (
                      <Text className={`font-space text-xs ${mutedText}`}>{t('subscription.instantActivation')}</Text>
                    )}
                  </View>
                  {isGwLoading
                    ? <ActivityIndicator color={theme.accent} />
                    : gw.enabled
                      ? <ArrowLeft size={17} color={theme.accent} style={{ transform: [{ rotate: '180deg' }] }} />
                      : null}
                </TouchableOpacity>
              );
            })}
          </View>
      </BottomSheet>

      {/* ─── Payment result modal ─── */}
      <Modal
        transparent
        visible={paymentResult !== null}
        animationType="fade"
        onRequestClose={() => setPaymentResult(null)}
      >
        <View style={{ flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View className={`w-full rounded-[28px] px-6 py-8 items-center ${surfaceBg}`}>
            <TouchableOpacity
              onPress={() => setPaymentResult(null)}
              activeOpacity={0.7}
              style={{ position: 'absolute', top: 18, right: 18, zIndex: 1 }}
            >
              <X size={22} color={theme.textMuted} />
            </TouchableOpacity>
            {paymentResult === 'success' ? (
              <>
                <View
                  style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: theme.accentStrong }}
                >
                  <Check size={34} color={theme.textInverse} strokeWidth={2.5} />
                </View>
                <Text className={`font-space-bold text-xl mb-1 ${primaryText}`}>{t('subscription.premiumTitle')}</Text>
                <Text className="font-space text-sm text-center mb-5" style={{ color: theme.textMuted }}>
                  {activeSub
                    ? t('subscription.premiumDays', { name: activeSub.packageName, days: String(activeSub.daysRemaining) })
                    : t('subscription.premiumActive')}
                </Text>
                <TouchableOpacity
                  onPress={() => { setPaymentResult(null); router.back(); }}
                  activeOpacity={0.88}
                  style={{ width: '100%', borderRadius: 14, overflow: 'hidden' }}
                >
                  <View
                    style={{ paddingVertical: 15, alignItems: 'center', backgroundColor: theme.accentStrong }}
                  >
                    <Text className="font-space-bold text-white text-base">{t('subscription.startLearning')}</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : paymentResult === 'pending' ? (
              <>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <ActivityIndicator size="large" color={theme.accent} />
                </View>
                <Text className={`font-space-bold text-xl mb-1 ${primaryText}`}>{t('subscription.pendingTitle')}</Text>
                <Text className="font-space text-sm text-center mb-5" style={{ color: theme.textMuted }}>
                  {t('subscription.pendingBody')}
                </Text>
                <TouchableOpacity
                  onPress={() => setPaymentResult(null)}
                  activeOpacity={0.88}
                  style={{ width: '100%', backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                >
                  <Text className="font-space-bold text-base" style={{ color: theme.textSoft }}>{t('subscription.close')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <X size={34} color={theme.danger} strokeWidth={2.5} />
                </View>
                <Text className={`font-space-bold text-xl mb-1 ${primaryText}`}>{t('subscription.paymentCancelled')}</Text>
                <Text className="font-space text-sm text-center mb-5" style={{ color: theme.textMuted }}>
                  {t('subscription.paymentCancelledBody')}
                </Text>
                <TouchableOpacity
                  onPress={() => setPaymentResult(null)}
                  activeOpacity={0.88}
                  style={{ width: '100%', backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                >
                  <Text className="font-space-bold text-base" style={{ color: theme.textSoft }}>{t('common.tryAgain')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
