import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Pressable } from 'react-native';
import { X, Check, Sparkles, Zap, BookOpen, Mic, Camera, Shield, Crown, Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { GiftIllustration } from '@/illustrations';

interface ProPaywallProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: 'monthly' | 'quarterly' | 'yearly') => void;
  trigger?: string;
}

const FEATURES = [
  { icon: Sparkles, color: '#7C3AED', labelKey: 'pro.featureUnlimitedAI', descKey: 'pro.featureUnlimitedAIDesc' },
  { icon: BookOpen, color: '#2F86EB', labelKey: 'pro.featureAllSubjects', descKey: 'pro.featureAllSubjectsDesc' },
  { icon: Zap, color: '#F59E0B', labelKey: 'pro.featureUnlimitedQuiz', descKey: 'pro.featureUnlimitedQuizDesc' },
  { icon: Mic, color: '#10B981', labelKey: 'pro.featureVoiceTutor', descKey: 'pro.featureVoiceTutorDesc' },
  { icon: Camera, color: '#EC4899', labelKey: 'pro.featurePhotoInput', descKey: 'pro.featurePhotoInputDesc' },
  { icon: Shield, color: '#EF4444', labelKey: 'pro.featureNoAds', descKey: 'pro.featureNoAdsDesc' },
  { icon: Flame, color: '#F97316', labelKey: 'pro.featureStreakFreeze', descKey: 'pro.featureStreakFreezeDesc' },
  { icon: Crown, color: '#8B5CF6', labelKey: 'pro.featureProBadge', descKey: 'pro.featureProBadgeDesc' },
];

export function ProPaywall({ visible, onClose, onSubscribe, trigger }: ProPaywallProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -8, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ),
    ]).start();
    return () => { scaleAnim.setValue(0.8); bounceAnim.setValue(0); };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.page, paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: theme.text }}>
              {t('pro.title') || 'Sensei'}
            </Text>
            <View style={{ backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: 'SpaceGrotesk_700Bold' }}>PRO</Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Gift illustration */}
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 16 }}>
            <Animated.View style={{ transform: [{ translateY: bounceAnim }, { scale: scaleAnim }] }}>
              <GiftIllustration size={120} />
            </Animated.View>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: theme.text, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }}>
              {t('pro.headline') || 'Unlock your full potential'}
            </Text>
          </View>

          {/* Social proof */}
          <View style={{ marginHorizontal: 20, backgroundColor: '#7C3AED10', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C3AED20', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#7C3AED" />
            </View>
            <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: theme.text, lineHeight: 19 }}>
              {t('pro.socialProof') || 'Pro members are 3x more likely to pass their admission test!'}
            </Text>
          </View>

          {/* Pricing cards */}
          <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
            {/* Monthly */}
            <Pressable
              onPress={() => onSubscribe('monthly')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: theme.border }}
            >
              <View>
                <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: theme.text }}>
                  {t('pro.monthly') || 'Monthly'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.textMuted, textDecorationLine: 'line-through' }}>৳299</Text>
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: theme.text }}>৳149/mo</Text>
                </View>
              </View>
            </Pressable>

            {/* Quarterly — highlighted */}
            <Pressable
              onPress={() => onSubscribe('quarterly')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#7C3AED' }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: theme.text }}>
                    {t('pro.quarterly') || '3 Months'}
                  </Text>
                  <View style={{ backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{t('pro.mostPopular') || 'Most Popular'}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  {t('pro.quarterlyPerMonth') || '৳116/mo'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.textMuted, textDecorationLine: 'line-through' }}>৳897</Text>
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#7C3AED' }}>৳349/3mo</Text>
                </View>
              </View>
            </Pressable>

            {/* Yearly */}
            <Pressable
              onPress={() => onSubscribe('yearly')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: theme.border }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: theme.text }}>
                    {t('pro.yearly') || 'Yearly'}
                  </Text>
                  <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, color: '#10B981' }}>
                    {t('pro.bestOffer') || 'Best offer'}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  {t('pro.yearlyPerMonth') || '৳83/mo'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.textMuted, textDecorationLine: 'line-through' }}>৳1788</Text>
                  <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: theme.text }}>৳999/yr</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Features list */}
          <View style={{ paddingHorizontal: 24 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: theme.text, textAlign: 'center', marginBottom: 16 }}>
              {t('pro.whatYouGet') || 'What you get with Pro'}
            </Text>
            {FEATURES.map(({ icon: Icon, color, labelKey, descKey }) => (
              <View key={labelKey} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Icon size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14, color: theme.text }}>
                    {t(labelKey) || labelKey.split('.').pop()}
                  </Text>
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.textMuted, marginTop: 2, lineHeight: 18 }}>
                    {t(descKey) || ''}
                  </Text>
                </View>
                <Check size={16} color="#10B981" style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: theme.page, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: theme.textMuted, textAlign: 'center', marginBottom: 8 }}>
            {t('pro.chargeNote') || 'Cancel anytime. No commitment.'}
          </Text>
          <TouchableOpacity
            onPress={() => onSubscribe('quarterly')}
            style={{ backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: 'SpaceGrotesk_700Bold' }}>
              {t('pro.cta') || 'Start my subscription'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 10, color: theme.textDisabled, textAlign: 'center', marginTop: 8 }}>
            🔒 {t('pro.secured') || 'Secured by bKash & Stripe'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
