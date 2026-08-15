import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useI18n } from '@/i18n/i18n-context';
import { LANGUAGE_REGIONS } from '@/constants/languages';
import { useAppTheme } from '@/theme';
import {
  MathIllustration,
  PhysicsIllustration,
  ChemistryIllustration,
  BiologyIllustration,
  AiTutorIllustration,
  PracticeIllustration,
  RocketIllustration,
  WelcomeIllustration,
} from '@/illustrations';

// Shared with the language section in Settings so both lists stay identical.
const COUNTRIES = LANGUAGE_REGIONS;

const LANGUAGE_CHOSEN_KEY = 'language_chosen';
const SPLASH_DURATION = 2800;
const { width } = Dimensions.get('window');

const FLOATING_ILLUSTRATIONS = [
  { Component: MathIllustration, x: 20, y: 60, size: 50, delay: 200 },
  { Component: PhysicsIllustration, x: width - 80, y: 100, size: 45, delay: 400 },
  { Component: ChemistryIllustration, x: 40, y: 200, size: 40, delay: 600 },
  { Component: BiologyIllustration, x: width - 100, y: 250, size: 48, delay: 800 },
  { Component: PracticeIllustration, x: 60, y: 340, size: 42, delay: 500 },
  { Component: RocketIllustration, x: width - 70, y: 380, size: 44, delay: 700 },
];

export default function ChooseLanguageScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { setLanguage } = useI18n();
  const [showSplash, setShowSplash] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const handleSelect = async (country: typeof COUNTRIES[0]) => {
    setSelectedId(country.id);
    setLanguage(country.lang as any);
    await AsyncStorage.setItem(LANGUAGE_CHOSEN_KEY, country.lang);
    await AsyncStorage.setItem('app_language', country.lang);
    await AsyncStorage.setItem('app_region', country.id);
    setTimeout(() => router.replace('/welcome-onboarding'), 300);
  };

  if (showSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        {FLOATING_ILLUSTRATIONS.map(({ Component, x, y, size, delay }, i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(delay).duration(500).springify()}
            style={{ position: 'absolute', left: x, top: y, opacity: 0.25 }}
          >
            <Component size={size} />
          </Animated.View>
        ))}

        <Animated.View entering={ZoomIn.delay(300).duration(600).springify()} style={{ alignItems: 'center' }}>
          <View style={{
            width: 140, height: 140, borderRadius: 70,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3, shadowRadius: 30,
          }}>
            <AiTutorIllustration size={100} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800).duration(400)} style={{ position: 'absolute', bottom: 60 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.5)',
              }} />
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      <Animated.View entering={FadeInUp.duration(400)} style={{ flex: 1, paddingTop: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 20, paddingHorizontal: 24 }}>
          <Animated.View entering={ZoomIn.delay(100).duration(400)}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: theme.accentSoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <WelcomeIllustration size={64} />
            </View>
          </Animated.View>
          <Text style={{
            fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20,
            color: theme.text, textAlign: 'center', marginTop: 14,
          }}>
            Where are you from?
          </Text>
        </View>

        <FlatList
          data={COUNTRIES}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
          renderItem={({ item, index }) => {
            const isSelected = selectedId === item.id;
            return (
              <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: isSelected ? theme.accentSoft : theme.surface,
                    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                    marginBottom: 6,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15,
                      color: isSelected ? theme.accent : theme.text,
                    }}>
                      {item.name}
                    </Text>
                    {item.name !== item.nameEn && (
                      <Text style={{
                        fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11,
                        color: theme.textMuted, marginTop: 1,
                      }}>
                        {item.nameEn}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
