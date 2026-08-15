import React from 'react';
import { Text, View, type TextStyle } from 'react-native';

interface Props {
  text: string;
  style?: TextStyle;
  boldStyle?: TextStyle;
  accentColor?: string;
  lineSpacing?: number;
}

function restoreLatexEscapes(raw: string): string {
  return raw
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/[\b]/g, '\\b')
    .replace(/\r/g, '\\r');
}

function prettifyMath(raw: string): string {
  let s = restoreLatexEscapes(raw);
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt\b/g, '√');
  s = s.replace(/\\pi\b/g, 'π');
  s = s.replace(/\\theta\b/g, 'θ');
  s = s.replace(/\\alpha\b/g, 'α');
  s = s.replace(/\\beta\b/g, 'β');
  s = s.replace(/\\gamma\b/g, 'γ');
  s = s.replace(/\\delta\b/g, 'δ');
  s = s.replace(/\\Delta\b/g, 'Δ');
  s = s.replace(/\\lambda\b/g, 'λ');
  s = s.replace(/\\mu\b/g, 'μ');
  s = s.replace(/\\omega\b/g, 'ω');
  s = s.replace(/\\sigma\b/g, 'σ');
  s = s.replace(/\\infty\b/g, '∞');
  s = s.replace(/\\pm\b/g, '±');
  s = s.replace(/\\times\b/g, '×');
  s = s.replace(/\\div\b/g, '÷');
  s = s.replace(/\\neq\b/g, '≠');
  s = s.replace(/\\leq\b/g, '≤');
  s = s.replace(/\\geq\b/g, '≥');
  s = s.replace(/\\approx\b/g, '≈');
  s = s.replace(/\\rightarrow\b/g, '→');
  s = s.replace(/\\Rightarrow\b/g, '⇒');
  s = s.replace(/\\int\b/g, '∫');
  s = s.replace(/\\sum\b/g, '∑');
  s = s.replace(/\\prod\b/g, '∏');
  s = s.replace(/\\partial\b/g, '∂');
  s = s.replace(/\\cdot\b/g, '·');
  s = s.replace(/\\vec\{([^}]+)\}/g, '$1⃗');
  s = s.replace(/\^{([^}]+)}/g, (_, p) => {
    const sup: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','x':'ˣ' };
    return p.split('').map((c: string) => sup[c] || c).join('');
  });
  s = s.replace(/\^(\d)/g, (_, d) => {
    const sup: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
    return sup[d] || d;
  });
  s = s.replace(/_{([^}]+)}/g, (_, p) => {
    const sub: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','a':'ₐ','e':'ₑ','i':'ᵢ','n':'ₙ','x':'ₓ' };
    return p.split('').map((c: string) => sub[c] || c).join('');
  });
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  // Remove remaining LaTeX commands but keep their braced content
  s = s.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  // Remove any leftover command names (no braces)
  s = s.replace(/\\[a-zA-Z]+/g, '');
  // Remove orphan braces only
  s = s.replace(/\{([^}]*)\}/g, '$1');
  return s.trim();
}

function parseInline(
  line: string,
  baseStyle: TextStyle,
  boldStyle: TextStyle,
  accentColor: string,
  key: number,
) {
  line = restoreLatexEscapes(line);
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\$\$(.+?)\$\$|\$(.+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`${key}-t-${lastIndex}`} style={baseStyle}>
          {line.slice(lastIndex, match.index)}
        </Text>,
      );
    }
    if (match[1]) {
      parts.push(
        <Text key={`${key}-b-${match.index}`} style={boldStyle}>
          {match[1]}
        </Text>,
      );
    } else if (match[2] || match[3]) {
      const mathContent = match[2] || match[3];
      parts.push(
        <Text
          key={`${key}-m-${match.index}`}
          style={{
            ...baseStyle,
            fontFamily: 'SpaceGrotesk_500Medium',
            backgroundColor: accentColor + '0C',
            color: accentColor,
            fontSize: (baseStyle.fontSize || 14) + 0.5,
            letterSpacing: 0.5,
          }}
        >
          {' '}{prettifyMath(mathContent)}{' '}
        </Text>,
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(
      <Text key={`${key}-t-${lastIndex}`} style={baseStyle}>
        {line.slice(lastIndex)}
      </Text>,
    );
  }

  if (parts.length === 0) {
    return <Text key={key} style={baseStyle}>{line}</Text>;
  }

  return <Text key={key}>{parts}</Text>;
}

// Detect **label:** value pattern (key-value)
function isKeyValue(line: string): { label: string; value: string } | null {
  const match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
  if (match) return { label: match[1], value: match[2] };
  const match2 = line.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
  if (match2) return { label: match2[1], value: match2[2] };
  return null;
}

// Detect formula/equation lines
function isFormula(line: string): boolean {
  const t = line.trim();
  // Lines with $ signs go through parseInline for proper math rendering
  if (t.includes('$')) return false;
  if (t.startsWith('"') && t.endsWith('"')) return true;
  // Only pure formula lines (no natural language mixed in)
  if (/^[A-Za-z0-9\s→+\-=()[\]{}.,×÷^_/\\<>∫∑√πΔ²³₀₁₂]+$/.test(t) && t.includes('→')) return true;
  return false;
}

// Detect question lines
function isQuestion(line: string): boolean {
  return line.trim().endsWith('?') && line.trim().length > 10;
}

export function FormattedText({
  text,
  style = {},
  boldStyle: boldOverride,
  accentColor = '#4F46E5',
  lineSpacing = 8,
}: Props) {
  const baseStyle: TextStyle = {
    fontSize: 14.5,
    lineHeight: 23,
    letterSpacing: 0.1,
    fontFamily: 'SpaceGrotesk_400Regular',
    ...style,
  };

  const boldStyle: TextStyle = {
    ...baseStyle,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
    color: accentColor,
    ...boldOverride,
  };

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inBulletGroup = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trimStart();

    if (trimmed === '') {
      inBulletGroup = false;
      elements.push(<View key={`sp-${i}`} style={{ height: lineSpacing }} />);
      continue;
    }

    // Block math: $$...$$ or lines that are purely $...$
    const blockMathMatch = trimmed.match(/^\$\$(.+?)\$\$$/s) || (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2 && !trimmed.slice(1, -1).includes('$') && /[=+\-×÷²³∫∑√πΔ\\^_]/.test(trimmed) ? [trimmed, trimmed.slice(1, -1)] : null);
    if (blockMathMatch) {
      inBulletGroup = false;
      elements.push(
        <View
          key={`bm-${i}`}
          style={{
            marginTop: 8,
            marginBottom: 4,
            backgroundColor: accentColor + '0A',
            borderWidth: 1,
            borderColor: accentColor + '18',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'SpaceGrotesk_600SemiBold',
              fontSize: 16,
              letterSpacing: 0.8,
              color: accentColor,
              textAlign: 'center',
              lineHeight: 26,
            }}
          >
            {prettifyMath(blockMathMatch[1])}
          </Text>
        </View>,
      );
      continue;
    }

    // Key-value pairs: **ভর:** explanation → colored tag + text
    const kv = isKeyValue(trimmed);
    if (kv) {
      inBulletGroup = false;
      elements.push(
        <View
          key={`kv-${i}`}
          style={{
            marginTop: i > 0 ? 8 : 0,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <View
            style={{
              backgroundColor: accentColor + '15',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginTop: 1,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk_700Bold',
                color: accentColor,
              }}
            >
              {kv.label}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {parseInline(kv.value, baseStyle, boldStyle, accentColor, i)}
          </View>
        </View>,
      );
      continue;
    }

    // Formula/equation lines → monospace tinted block
    if (isFormula(trimmed)) {
      inBulletGroup = false;
      elements.push(
        <View
          key={`fm-${i}`}
          style={{
            marginTop: i > 0 ? 8 : 4,
            backgroundColor: accentColor + '0A',
            borderWidth: 1,
            borderColor: accentColor + '18',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              ...baseStyle,
              fontFamily: 'SpaceGrotesk_500Medium',
              fontSize: 13.5,
              letterSpacing: 0.3,
              color: baseStyle.color,
            }}
          >
            {prettifyMath(trimmed.replace(/^"|"$/g, '').replace(/^\$+|\$+$/g, ''))}
          </Text>
        </View>,
      );
      continue;
    }

    // Bullet lists
    const isBullet =
      trimmed.startsWith('* ') ||
      trimmed.startsWith('- ') ||
      /^\d+\.\s/.test(trimmed);

    if (isBullet) {
      const isFirst = !inBulletGroup;
      inBulletGroup = true;
      const bulletChar = /^\d+\./.test(trimmed)
        ? trimmed.match(/^\d+\./)![0]
        : '•';
      const content = trimmed.replace(/^(\*|-|\d+\.)\s+/, '');

      // Check if bullet content has a key-value pattern
      const bulletKv = isKeyValue('**' + content.replace(/^(\*\*.+?\*\*):?\s*/, '$1:**'));
      const bulletKvDirect = content.match(/^(\*\*.+?\*\*):?\s*(.+)$/);

      elements.push(
        <View
          key={`bl-${i}`}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: isFirst ? 8 : 5,
            paddingLeft: 2,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: accentColor + '60',
              marginTop: 8,
              marginRight: 10,
            }}
          />
          <View style={{ flex: 1 }}>
            {parseInline(content, baseStyle, boldStyle, accentColor, i)}
          </View>
        </View>,
      );
      continue;
    }

    // Quoted / indented blocks
    if (trimmed.startsWith('"') || trimmed.startsWith('→') || trimmed.startsWith('>')) {
      inBulletGroup = false;
      const content = trimmed.replace(/^("|→|>)\s*/, '');
      elements.push(
        <View
          key={`qt-${i}`}
          style={{
            marginTop: i > 0 ? 8 : 0,
            borderLeftWidth: 3,
            borderLeftColor: accentColor + '40',
            backgroundColor: accentColor + '08',
            borderRadius: 8,
            paddingLeft: 12,
            paddingVertical: 10,
            paddingRight: 10,
          }}
        >
          {parseInline(content || trimmed, { ...baseStyle, fontFamily: 'SpaceGrotesk_500Medium' }, boldStyle, accentColor, i)}
        </View>,
      );
      continue;
    }

    // Question lines → highlighted
    if (isQuestion(trimmed)) {
      inBulletGroup = false;
      elements.push(
        <View
          key={`q-${i}`}
          style={{
            marginTop: i > 0 ? 10 : 0,
            backgroundColor: '#F4C542' + '12',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: '#F4C542' + '25',
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={{ ...baseStyle, fontFamily: 'SpaceGrotesk_600SemiBold', fontWeight: '600' }}>💡 </Text>
            {parseInline(trimmed, { ...baseStyle, fontFamily: 'SpaceGrotesk_600SemiBold', fontWeight: '600' }, boldStyle, accentColor, i)}
          </View>
        </View>,
      );
      continue;
    }

    // Regular text
    inBulletGroup = false;
    elements.push(
      <View key={`ln-${i}`} style={{ marginTop: i > 0 ? 3 : 0 }}>
        {parseInline(raw, baseStyle, boldStyle, accentColor, i)}
      </View>,
    );
  }

  return <View style={{ gap: 1 }}>{elements}</View>;
}
