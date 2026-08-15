import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { X, Send, Delete } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme';

interface EquationEditorProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

const SYMBOL_GROUPS = [
  {
    label: 'Basic',
    symbols: [
      { display: '+', latex: '+' },
      { display: '−', latex: '-' },
      { display: '×', latex: '\\times ' },
      { display: '÷', latex: '\\div ' },
      { display: '=', latex: '=' },
      { display: '≠', latex: '\\neq ' },
      { display: '≈', latex: '\\approx ' },
      { display: '±', latex: '\\pm ' },
      { display: '(', latex: '(' },
      { display: ')', latex: ')' },
      { display: '<', latex: '<' },
      { display: '>', latex: '>' },
      { display: '≤', latex: '\\leq ' },
      { display: '≥', latex: '\\geq ' },
    ],
  },
  {
    label: 'Powers',
    symbols: [
      { display: 'x²', latex: '^2' },
      { display: 'x³', latex: '^3' },
      { display: 'xⁿ', latex: '^{n}' },
      { display: 'x₀', latex: '_{0}' },
      { display: 'x₁', latex: '_{1}' },
      { display: 'xₙ', latex: '_{n}' },
      { display: '√', latex: '\\sqrt{' },
      { display: 'ⁿ√', latex: '\\sqrt[n]{' },
      { display: 'a/b', latex: '\\frac{a}{b}' },
    ],
  },
  {
    label: 'Greek',
    symbols: [
      { display: 'α', latex: '\\alpha ' },
      { display: 'β', latex: '\\beta ' },
      { display: 'γ', latex: '\\gamma ' },
      { display: 'δ', latex: '\\delta ' },
      { display: 'θ', latex: '\\theta ' },
      { display: 'λ', latex: '\\lambda ' },
      { display: 'μ', latex: '\\mu ' },
      { display: 'π', latex: '\\pi ' },
      { display: 'σ', latex: '\\sigma ' },
      { display: 'ω', latex: '\\omega ' },
      { display: 'Δ', latex: '\\Delta ' },
      { display: 'Σ', latex: '\\Sigma ' },
    ],
  },
  {
    label: 'Calculus',
    symbols: [
      { display: '∫', latex: '\\int ' },
      { display: '∂', latex: '\\partial ' },
      { display: '∑', latex: '\\sum ' },
      { display: '∏', latex: '\\prod ' },
      { display: '∞', latex: '\\infty ' },
      { display: 'lim', latex: '\\lim_{x \\to }' },
      { display: 'dx', latex: 'dx' },
      { display: 'dy/dx', latex: '\\frac{dy}{dx}' },
      { display: '→', latex: '\\rightarrow ' },
      { display: '⇒', latex: '\\Rightarrow ' },
    ],
  },
  {
    label: 'Trig',
    symbols: [
      { display: 'sin', latex: '\\sin ' },
      { display: 'cos', latex: '\\cos ' },
      { display: 'tan', latex: '\\tan ' },
      { display: 'sin⁻¹', latex: '\\sin^{-1} ' },
      { display: 'cos⁻¹', latex: '\\cos^{-1} ' },
      { display: 'tan⁻¹', latex: '\\tan^{-1} ' },
      { display: 'log', latex: '\\log ' },
      { display: 'ln', latex: '\\ln ' },
      { display: 'e', latex: 'e' },
      { display: '°', latex: '^{\\circ}' },
    ],
  },
  {
    label: 'Physics',
    symbols: [
      { display: 'F⃗', latex: '\\vec{F}' },
      { display: 'v⃗', latex: '\\vec{v}' },
      { display: 'a⃗', latex: '\\vec{a}' },
      { display: 'ℏ', latex: '\\hbar ' },
      { display: '·', latex: '\\cdot ' },
      { display: 'Ω', latex: '\\Omega ' },
      { display: '½mv²', latex: '\\frac{1}{2}mv^2' },
      { display: 'F=ma', latex: 'F = ma' },
      { display: 'E=mc²', latex: 'E = mc^2' },
    ],
  },
];

export function EquationEditor({ visible, onClose, onInsert }: EquationEditorProps) {
  const theme = useAppTheme();
  const [latex, setLatex] = useState('');
  const [activeGroup, setActiveGroup] = useState(0);

  const insertSymbol = useCallback((sym: string) => {
    setLatex(prev => prev + sym);
  }, []);

  const handleBackspace = useCallback(() => {
    setLatex(prev => prev.slice(0, -1));
  }, []);

  const handleInsert = useCallback(() => {
    if (latex.trim()) {
      onInsert('$' + latex.trim() + '$');
      setLatex('');
    }
  }, [latex, onInsert]);

  const handleClose = useCallback(() => {
    setLatex('');
    onClose();
  }, [onClose]);

  const group = SYMBOL_GROUPS[activeGroup];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <TouchableOpacity onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt }}>
            <X size={18} color={theme.textSoft} />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: theme.text }}>সমীকরণ এডিটর</Text>
          <TouchableOpacity onPress={handleInsert} disabled={!latex.trim()} style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: latex.trim() ? theme.accentStrong : theme.surfaceAlt }}>
            <Send size={14} color={latex.trim() ? '#fff' : theme.textMuted} />
            <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: latex.trim() ? '#fff' : theme.textMuted }}>Insert</Text>
          </TouchableOpacity>
        </View>

        {/* Preview area */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 2, borderColor: latex ? theme.accent : theme.border, padding: 16, minHeight: 80, justifyContent: 'center' }}>
            {latex ? (
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 22, color: theme.text, letterSpacing: 0.5 }}>{latex}</Text>
            ) : (
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 16, color: theme.textDisabled }}>সিম্বল ট্যাপ করে সমীকরণ তৈরি করো...</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
            <TouchableOpacity onPress={handleBackspace} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.surfaceAlt }}>
              <Delete size={14} color={theme.textMuted} />
              <Text style={{ fontSize: 12, color: theme.textMuted }}>মুছো</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLatex('')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.surfaceAlt }}>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>সব মুছো</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text input for typing */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <TextInput
            value={latex}
            onChangeText={setLatex}
            placeholder="অথবা টাইপ করো: x^2 + 2x + 1 = 0"
            placeholderTextColor={theme.textDisabled}
            style={{ backgroundColor: theme.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: theme.text, fontFamily: 'SpaceGrotesk_400Regular' }}
          />
        </View>

        {/* Group tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 8 }}>
          {SYMBOL_GROUPS.map((g, i) => (
            <TouchableOpacity
              key={g.label}
              onPress={() => setActiveGroup(i)}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: i === activeGroup ? theme.accent : theme.surfaceAlt }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: i === activeGroup ? '#fff' : theme.textMuted }}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Symbol grid */}
        <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {group.symbols.map((sym, i) => (
              <TouchableOpacity
                key={`${group.label}-${i}`}
                onPress={() => insertSymbol(sym.latex)}
                activeOpacity={0.7}
                style={{
                  width: 60, height: 48, borderRadius: 12,
                  backgroundColor: theme.surface,
                  borderWidth: 1, borderColor: theme.border,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, color: theme.text, fontWeight: '500' }}>{sym.display}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Number row */}
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {['0','1','2','3','4','5','6','7','8','9','x','y'].map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => insertSymbol(n)}
                style={{ width: 44, height: 40, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600' }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
