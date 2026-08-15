import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useAppTheme } from '@/theme';

interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Props {
  question: string;
  options: Option[];
  university?: string;
  year?: string;
  onAnswer?: (optionId: string, correct: boolean) => void;
  onAskSensei?: (question: string, selected: string, correct: string) => void;
}

export function ChatMcqCard({ question, options, university, year, onAnswer, onAskSensei }: Props) {
  const theme = useAppTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const selectedOption = options.find(o => o.id === selected);
  const isCorrect = selectedOption?.isCorrect ?? false;
  const correctOption = options.find(o => o.isCorrect);

  const handleSelect = (optionId: string) => {
    if (answered) return;
    setSelected(optionId);
    const correct = options.find(o => o.id === optionId)?.isCorrect ?? false;
    onAnswer?.(optionId, correct);
  };

  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: 16, padding: 14,
      marginVertical: 6, borderWidth: 1, borderColor: theme.border,
    }}>
      {(university || year) && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {university && (
            <View style={{ backgroundColor: theme.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: theme.accent, fontFamily: 'SpaceGrotesk_600SemiBold' }}>{university.toUpperCase()}</Text>
            </View>
          )}
          {year && (
            <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'SpaceGrotesk_500Medium' }}>{year}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: theme.text, lineHeight: 22, marginBottom: 10 }}>
        {question}
      </Text>

      <View style={{ gap: 6 }}>
        {options.map((opt) => {
          const isThis = selected === opt.id;
          const showCorrect = answered && opt.isCorrect;
          const showWrong = answered && isThis && !opt.isCorrect;

          let bg = theme.surfaceAlt;
          let border = 'transparent';
          let textColor = theme.text;

          if (showCorrect) { bg = '#DCFCE7'; border = '#22C55E'; textColor = '#166534'; }
          else if (showWrong) { bg = '#FEE2E2'; border = '#EF4444'; textColor = '#991B1B'; }
          else if (isThis) { bg = theme.accentSoft; border = theme.accent; }

          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={answered ? 1 : 0.7}
              onPress={() => handleSelect(opt.id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                borderWidth: 1.5, borderColor: border,
              }}
            >
              <View style={{
                width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: showCorrect ? '#22C55E' : showWrong ? '#EF4444' : theme.surface,
              }}>
                {showCorrect ? <CheckCircle2 size={14} color="#fff" /> :
                 showWrong ? <XCircle size={14} color="#fff" /> :
                 <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>{opt.id}</Text>}
              </View>
              <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: textColor, lineHeight: 19 }}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {answered && !isCorrect && onAskSensei && correctOption && (
        <TouchableOpacity
          onPress={() => onAskSensei(question, selectedOption?.text || '', correctOption.text)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: theme.heroBg, borderRadius: 10, paddingVertical: 10, marginTop: 10,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' }}>
            Sensei-কে জিজ্ঞেস করো
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
