import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, BookOpen, Bookmark } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';

interface Props {
  title: string;
  concepts: string[];
  formula?: string;
  tip?: string;
}

export function ConceptSummaryCard({ title, concepts, formula, tip }: Props) {
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={{
      marginHorizontal: 4, marginVertical: 8,
      backgroundColor: theme.accentSoft, borderRadius: 16,
      borderWidth: 1, borderColor: theme.accent + '30',
      overflow: 'hidden',
    }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 14, paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={14} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: theme.accent }}>
              {language === 'bn' ? 'ধারণা সারাংশ' : 'Concept Summary'}
            </Text>
            <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 11, color: theme.text, marginTop: 1 }} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        {expanded ? <ChevronUp size={16} color={theme.accent} /> : <ChevronDown size={16} color={theme.accent} />}
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
          {formula && (
            <View style={{
              backgroundColor: theme.surface, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
              alignItems: 'center',
            }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: theme.accent, letterSpacing: 0.5 }}>
                {formula}
              </Text>
            </View>
          )}

          {concepts.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: theme.accent, marginTop: 6 }} />
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.text, flex: 1, lineHeight: 18 }}>
                {c}
              </Text>
            </View>
          ))}

          {tip && (
            <View style={{ backgroundColor: '#F4C54215', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 }}>
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 11, color: '#92400E' }}>
                💡 {tip}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
