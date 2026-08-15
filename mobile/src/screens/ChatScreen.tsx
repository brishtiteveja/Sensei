/**
 * The primary screen: Socratic tutoring, streaming, multilingual.
 *
 * Two things here are demo-critical:
 *  - tokens must visibly land one at a time (a spinner then a wall of text reads as a
 *    canned response, and the whole point is that this is running on the box in the room)
 *  - the root-cause redirect must be impossible to miss when it fires
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Btn, Dot, ErrorNote, Field, Header, Txt } from '../components/ui';
import { useStore } from '../state/store';
import { colors, radius, space } from '../theme';

const SUGGESTIONS = [
  'আমি এই অঙ্কটা বুঝতে পারছি না',
  'Explain this to me step by step',
  'আমি কোথায় ভুল করলাম?',
];

export default function ChatScreen() {
  const {
    messages,
    streaming,
    send,
    stop,
    clearChat,
    activeConcept,
    health,
    healthError,
    setTab,
  } = useStore();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const onSend = useCallback(
    (text?: string) => {
      const body = (text ?? draft).trim();
      if (!body || streaming) return;
      send(body);
      setDraft('');
    },
    [draft, send, streaming],
  );

  const online = !!health && !healthError;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <Header
        title="Sensei"
        subtitle={
          activeConcept ? `Working on: ${activeConcept.label}` : 'Ask anything — it will not just tell you'
        }
        right={
          <View style={styles.headerRight}>
            <Pressable onPress={() => setTab('settings')} style={styles.statusPill} hitSlop={8}>
              <Dot color={online ? (health?.warm ? colors.accent : colors.warn) : colors.danger} />
              <Txt size={11} color={colors.textDim}>
                {online ? (health?.warm ? 'warm' : 'cold') : 'offline'}
              </Txt>
            </Pressable>
            {messages.length > 0 ? (
              <Pressable onPress={clearChat} hitSlop={8}>
                <Txt size={12} color={colors.textDim}>
                  Clear
                </Txt>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardDismissMode="interactive"
      >
        {messages.length === 0 ? <Empty onPick={onSend} /> : null}
        {messages.map((m) => (
          <View key={m.id}>
            {m.rootCause ? <RootCauseBanner text={m.rootCause} /> : null}
            <Bubble
              role={m.role}
              content={m.content}
              streaming={!!m.streaming}
              error={m.error ?? null}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <Field
          value={draft}
          onChangeText={setDraft}
          placeholder="Type in Bangla or English…"
          multiline
          autoCapitalize="sentences"
          autoCorrect
          containerStyle={styles.flex}
          style={styles.input}
          onSubmitEditing={() => onSend()}
        />
        {streaming ? (
          <Btn label="Stop" kind="danger" onPress={stop} style={styles.sendBtn} />
        ) : (
          <Btn label="Send" onPress={() => onSend()} disabled={!draft.trim()} style={styles.sendBtn} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * The graph telling us the student's actual problem is upstream. This is the single
 * most important thing on screen when it appears -- it is what separates a tutor from
 * a chatbot -- so it gets its own banner rather than being folded into the answer.
 */
function RootCauseBanner({ text }: { text: string }) {
  return (
    <View style={styles.rootCause}>
      <Txt size={11} bold color={colors.warn}>
        GOING BACK TO THE REAL PROBLEM
      </Txt>
      <Txt size={13} color={colors.text}>
        {text}
      </Txt>
    </View>
  );
}

function Bubble({
  role,
  content,
  streaming,
  error,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming: boolean;
  error: string | null;
}) {
  const mine = role === 'user';
  const empty = !content.trim();
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: mine ? colors.bubbleUser : colors.bubbleTutor },
          mine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        {empty && streaming ? (
          // No spinner: a cold swap can take minutes and a spinner says nothing about
          // whether anything is happening. Say what is actually going on.
          <Txt size={14} color={colors.textDim}>
            Thinking… (first reply after a cold start can take a few minutes)
          </Txt>
        ) : (
          <Txt size={16} selectable>
            {content}
            {streaming ? <Txt size={16} color={colors.accent}>▍</Txt> : null}
          </Txt>
        )}
        {error ? (
          <View style={{ marginTop: space.sm }}>
            <ErrorNote message={error} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Empty({ onPick }: { onPick: (t: string) => void }) {
  return (
    <View style={styles.empty}>
      <Txt size={22} bold>
        সেনসেই
      </Txt>
      <Txt size={14} color={colors.textDim}>
        A tutor that never hands over the answer. Everything below runs on the box in this
        room — no cloud, no account, no network.
      </Txt>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} onPress={() => onPick(s)} style={styles.suggestion}>
            <Txt size={15}>{s}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  bubbleRow: { flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleMine: { borderBottomRightRadius: radius.sm },
  bubbleTheirs: { borderBottomLeftRadius: radius.sm },
  rootCause: {
    backgroundColor: 'rgba(245,165,36,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: colors.warn,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.sm,
    gap: 2,
  },
  empty: { gap: space.sm, paddingVertical: space.xl },
  suggestion: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: { maxHeight: 120, minHeight: 46 },
  sendBtn: { minWidth: 84 },
});
