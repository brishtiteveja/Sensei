import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { evaluate } from 'mathjs';
import * as Haptics from 'expo-haptics';
import { Delete } from 'lucide-react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';

interface CalculatorSheetProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}

type CalcMode = 'simple' | 'scientific';

interface ButtonDef {
  label: string;
  type: 'number' | 'operator' | 'action' | 'equals' | 'clear' | 'function';
}

const SIMPLE_ROWS: ButtonDef[][] = [
  [
    { label: 'C', type: 'clear' },
    { label: '⌫', type: 'action' },
    { label: '%', type: 'operator' },
    { label: '÷', type: 'operator' },
  ],
  [
    { label: '7', type: 'number' },
    { label: '8', type: 'number' },
    { label: '9', type: 'number' },
    { label: '×', type: 'operator' },
  ],
  [
    { label: '4', type: 'number' },
    { label: '5', type: 'number' },
    { label: '6', type: 'number' },
    { label: '-', type: 'operator' },
  ],
  [
    { label: '1', type: 'number' },
    { label: '2', type: 'number' },
    { label: '3', type: 'number' },
    { label: '+', type: 'operator' },
  ],
  [
    { label: '±', type: 'action' },
    { label: '0', type: 'number' },
    { label: '.', type: 'number' },
    { label: '=', type: 'equals' },
  ],
];

const SCIENTIFIC_ROWS: ButtonDef[][] = [
  [
    { label: 'sin', type: 'function' },
    { label: 'cos', type: 'function' },
    { label: 'tan', type: 'function' },
    { label: 'log', type: 'function' },
  ],
  [
    { label: 'ln', type: 'function' },
    { label: '√', type: 'function' },
    { label: 'x²', type: 'function' },
    { label: 'xⁿ', type: 'function' },
  ],
  [
    { label: 'π', type: 'function' },
    { label: 'e', type: 'function' },
    { label: '(', type: 'number' },
    { label: ')', type: 'number' },
  ],
];

/** Map button labels to accessible spoken names */
const BUTTON_A11Y_LABELS: Record<string, string> = {
  C: 'Clear',
  '⌫': 'Backspace',
  '%': 'Percent',
  '÷': 'Divide',
  '×': 'Multiply',
  '-': 'Minus',
  '+': 'Plus',
  '=': 'Equals',
  '.': 'Decimal point',
  '±': 'Toggle sign',
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  sin: 'Sine',
  cos: 'Cosine',
  tan: 'Tangent',
  log: 'Logarithm',
  ln: 'Natural log',
  '√': 'Square root',
  'x²': 'Square',
  'xⁿ': 'Power',
  'π': 'Pi',
  e: 'Euler number',
  '(': 'Open parenthesis',
  ')': 'Close parenthesis',
};

/** Map display symbols to mathjs-compatible expression tokens */
function toMathExpression(expr: string): string {
  return expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√\(/g, 'sqrt(')
    .replace(/ln\(/g, 'log(') // mathjs log() is natural log
    .replace(/log\(/g, 'log10(');
}

export function CalculatorSheet({ visible, onClose, onInsert }: CalculatorSheetProps) {
  const theme = useAppTheme();
  const { t } = useI18n();

  const [mode, setMode] = useState<CalcMode>('simple');
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [hasError, setHasError] = useState(false);

  const handleClose = useCallback(() => {
    setExpression('');
    setResult('');
    setHasError(false);
    onClose();
  }, [onClose]);

  const hapticPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEvaluate = useCallback(
    (expr: string) => {
      if (!expr.trim()) return;
      try {
        const mathExpr = toMathExpression(expr);
        const res = evaluate(mathExpr);
        const formatted =
          typeof res === 'number'
            ? Number.isInteger(res)
              ? res.toString()
              : parseFloat(res.toFixed(10)).toString()
            : String(res);
        setResult(formatted);
        setHasError(false);
      } catch {
        setResult(t('chatTools.calcError'));
        setHasError(true);
      }
    },
    [t],
  );

  const handleButtonPress = useCallback(
    (btn: ButtonDef) => {
      hapticPress();

      switch (btn.label) {
        case 'C':
          setExpression('');
          setResult('');
          setHasError(false);
          break;

        case '⌫':
          setExpression((prev) => prev.slice(0, -1));
          setResult('');
          setHasError(false);
          break;

        case '=':
          handleEvaluate(expression);
          break;

        case '±': {
          // Toggle sign: find the last number and negate it
          setExpression((prev) => {
            if (!prev) return '-';
            // If expression starts with -, remove it; otherwise add it
            const match = prev.match(/(-?\d+\.?\d*)$/);
            if (match) {
              const num = match[1];
              const idx = match.index!;
              const before = prev.slice(0, idx);
              if (num.startsWith('-')) {
                return before + num.slice(1);
              }
              return before + '-' + num;
            }
            return prev;
          });
          break;
        }

        // Scientific functions
        case 'sin':
        case 'cos':
        case 'tan':
          setExpression((prev) => prev + btn.label + '(');
          break;
        case 'log':
          setExpression((prev) => prev + 'log(');
          break;
        case 'ln':
          setExpression((prev) => prev + 'ln(');
          break;
        case '√':
          setExpression((prev) => prev + '√(');
          break;
        case 'x²':
          setExpression((prev) => prev + '^2');
          break;
        case 'xⁿ':
          setExpression((prev) => prev + '^');
          break;
        case 'π':
          setExpression((prev) => prev + 'π');
          break;
        case 'e':
          setExpression((prev) => prev + 'e');
          break;

        // Numbers, operators, parens
        default:
          setExpression((prev) => prev + btn.label);
          break;
      }
    },
    [expression, handleEvaluate, hapticPress],
  );

  const handleInsert = useCallback(() => {
    if (result && !hasError) {
      onInsert(expression + ' = ' + result);
    }
  }, [expression, result, hasError, onInsert]);

  const getButtonStyle = (btn: ButtonDef) => {
    switch (btn.type) {
      case 'clear':
        return {
          backgroundColor: theme.danger + '15',
        };
      case 'operator':
        return {
          backgroundColor: theme.accentSoft,
        };
      case 'equals':
        return {
          backgroundColor: theme.accentStrong,
        };
      case 'function':
        return {
          backgroundColor: theme.accentSoft,
        };
      default:
        return {
          backgroundColor: theme.surface,
        };
    }
  };

  const getTextStyle = (btn: ButtonDef) => {
    switch (btn.type) {
      case 'clear':
        return { color: theme.danger, fontSize: 18 };
      case 'operator':
        return { color: theme.accent, fontSize: 20 };
      case 'equals':
        return { color: '#FFFFFF', fontSize: 22 };
      case 'function':
        return { color: theme.accent, fontSize: 12 };
      default:
        return { color: theme.text, fontSize: 20 };
    }
  };

  const allRows = mode === 'scientific' ? [...SCIENTIFIC_ROWS, ...SIMPLE_ROWS] : SIMPLE_ROWS;

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        {/* Mode Toggle Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.surfaceAlt,
            borderRadius: 12,
            padding: 3,
            marginBottom: 16,
          }}
        >
          {(['simple', 'scientific'] as CalcMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              activeOpacity={0.7}
              onPress={() => {
                hapticPress();
                setMode(m);
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: mode === m ? theme.surface : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: mode === m ? 'SpaceGrotesk-SemiBold' : 'SpaceGrotesk-Medium',
                  fontSize: 13,
                  color: mode === m ? theme.accent : theme.textMuted,
                }}
              >
                {m === 'simple' ? t('chatTools.calcSimple') : t('chatTools.calcScientific')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Display Area */}
        <View
          style={{
            backgroundColor: theme.surfaceAlt,
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            minHeight: 80,
            justifyContent: 'flex-end',
          }}
        >
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Regular',
              fontSize: 16,
              color: theme.textMuted,
              textAlign: 'right',
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {expression || ' '}
          </Text>
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Bold',
              fontSize: 28,
              color: hasError ? theme.danger : theme.text,
              textAlign: 'right',
            }}
            numberOfLines={1}
          >
            {result || ' '}
          </Text>
        </View>

        {/* Button Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{ maxHeight: mode === 'scientific' ? 400 : 320 }}
        >
          {allRows.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 8,
              }}
            >
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn.label}
                  activeOpacity={0.6}
                  onPress={() => handleButtonPress(btn)}
                  accessibilityLabel={BUTTON_A11Y_LABELS[btn.label] || btn.label}
                  accessibilityRole="button"
                  style={[
                    {
                      flex: 1,
                      height: 56,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    getButtonStyle(btn),
                  ]}
                >
                  {btn.label === '⌫' ? (
                    <Delete size={20} color={theme.text} />
                  ) : (
                    <Text
                      style={[
                        { fontFamily: 'SpaceGrotesk-SemiBold' },
                        getTextStyle(btn),
                      ]}
                    >
                      {btn.label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Insert to Chat Button */}
        <TouchableOpacity
          activeOpacity={result && !hasError ? 0.7 : 1}
          onPress={handleInsert}
          disabled={!result || hasError}
          style={{
            marginTop: 4,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
            backgroundColor: result && !hasError ? theme.accentStrong : theme.accentDisabled,
          }}
        >
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}
          >
            {t('chatTools.insertToChat')}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}
