/**
 * The course path: a topological walk of the knowledge graph, gated by mastery.
 *
 * Three states, matching backend/sensei/graph.py:
 *   mastered  mastery >= MASTERY_THRESHOLD
 *   unlocked  every prerequisite mastered, this one not yet  (server sends the list)
 *   locked    something upstream is still missing
 *
 * Tapping an unlocked concept sets it as the tutoring target, which is what lets the
 * backend run the root-cause redirect on the next chat turn.
 */

import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { MASTERY_THRESHOLD, type PathConcept } from '../api/types';
import { ErrorNote, Header, Txt } from '../components/ui';
import { useStore } from '../state/store';
import { colors, radius, space } from '../theme';

type State = 'mastered' | 'unlocked' | 'locked';

export default function PathScreen() {
  const { path, pathError, pathLoading, refreshPath, activeConcept, setActiveConcept, setTab } =
    useStore();

  const unlocked = new Set(path?.unlocked ?? []);
  const stateOf = (c: PathConcept): State =>
    c.mastery >= MASTERY_THRESHOLD ? 'mastered' : unlocked.has(c.id) ? 'unlocked' : 'locked';

  const mastered = (path?.concepts ?? []).filter((c) => c.mastery >= MASTERY_THRESHOLD).length;
  const total = path?.concepts.length ?? 0;

  return (
    <View style={styles.flex}>
      <Header
        title="Course"
        subtitle={total ? `${mastered} of ${total} concepts mastered` : 'Knowledge graph, in order'}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={pathLoading} onRefresh={refreshPath} tintColor={colors.textDim} />
        }
      >
        {pathError ? <ErrorNote message={pathError} /> : null}

        {!path && pathLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
        ) : null}

        {path && path.concepts.length === 0 ? (
          <Txt size={14} color={colors.textDim}>
            No course loaded on the box yet. Build one with POST /curriculum/build.
          </Txt>
        ) : null}

        {(path?.concepts ?? []).map((c, i) => {
          const state = stateOf(c);
          const isNext = path?.next === c.id;
          const isActive = activeConcept?.id === c.id;
          return (
            <View key={c.id}>
              {i > 0 ? <View style={styles.connector} /> : null}
              <Pressable
                disabled={state === 'locked'}
                onPress={() => {
                  setActiveConcept({ id: c.id, label: c.name_local || c.name });
                  setTab('chat');
                }}
                style={({ pressed }) => [
                  styles.node,
                  state === 'locked' && styles.nodeLocked,
                  state === 'mastered' && styles.nodeMastered,
                  isNext && styles.nodeNext,
                  isActive && styles.nodeActive,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.badge, badgeStyle(state)]}>
                  <Txt size={14} bold color={state === 'locked' ? colors.textDim : '#0B0F14'}>
                    {state === 'mastered' ? '✓' : state === 'locked' ? '•' : String(i + 1)}
                  </Txt>
                </View>

                <View style={styles.flex}>
                  {/* Local-language name leads: this is the whole multilingual claim. */}
                  <Txt size={16} bold color={state === 'locked' ? colors.textDim : colors.text}>
                    {c.name_local || c.name}
                  </Txt>
                  {c.name_local ? (
                    <Txt size={12} color={colors.textDim}>
                      {c.name}
                    </Txt>
                  ) : null}
                  <MasteryBar value={c.mastery} state={state} />
                </View>

                <View style={styles.tags}>
                  {isNext ? (
                    <Txt size={10} bold color={colors.accent}>
                      NEXT
                    </Txt>
                  ) : null}
                  {isActive ? (
                    <Txt size={10} bold color={colors.warn}>
                      TUTORING
                    </Txt>
                  ) : null}
                  <Txt size={11} color={colors.textDim}>
                    {Math.round(c.mastery * 100)}%
                  </Txt>
                </View>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MasteryBar({ value, state }: { value: number; state: State }) {
  const pct = Math.max(0, Math.min(1, value));
  const fill = state === 'mastered' ? colors.accent : state === 'unlocked' ? colors.warn : colors.border;
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: fill }]} />
    </View>
  );
}

function badgeStyle(state: State) {
  if (state === 'mastered') return { backgroundColor: colors.accent };
  if (state === 'unlocked') return { backgroundColor: colors.warn };
  return { backgroundColor: colors.surfaceAlt };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  connector: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 33 },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  nodeLocked: { opacity: 0.5 },
  nodeMastered: { borderColor: colors.accentDim },
  nodeNext: { borderColor: colors.accent, borderWidth: 2 },
  nodeActive: { backgroundColor: colors.surfaceAlt },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
  tags: { alignItems: 'flex-end', gap: 2 },
});
