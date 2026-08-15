/**
 * The screen that makes the event survivable.
 *
 * The GB10's LAN address is not known until we are in the room, so the backend URL is a
 * text field persisted to AsyncStorage -- never a constant. Retargeting the app must
 * cost one edit, not a rebuild.
 *
 * The health block is the pre-flight check: `warm: false` means the next request pays a
 * 1-5 minute cold swap, which on stage is indistinguishable from a crash.
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { normalizeBaseUrl } from '../api/http';
import { Btn, Card, Dot, ErrorNote, Field, Header, Txt } from '../components/ui';
import { DEFAULT_BASE_URL, useStore } from '../state/store';
import { colors, space } from '../theme';

export default function SettingsScreen() {
  const {
    baseUrl,
    setBaseUrl,
    learnerId,
    setLearnerId,
    health,
    healthError,
    healthChecking,
    refreshHealth,
    refreshPath,
  } = useStore();

  const [urlDraft, setUrlDraft] = useState(baseUrl);
  const [idDraft, setIdDraft] = useState(learnerId);

  // Keep the drafts in step with hydration from storage.
  useEffect(() => setUrlDraft(baseUrl), [baseUrl]);
  useEffect(() => setIdDraft(learnerId), [learnerId]);

  const dirty = urlDraft !== baseUrl || idDraft.trim() !== learnerId;

  const save = () => {
    setBaseUrl(urlDraft);
    setLearnerId(idDraft);
    // Give immediate feedback that the new address works, rather than making someone
    // switch tabs to find out.
    setTimeout(() => {
      refreshHealth();
      refreshPath();
    }, 0);
  };

  return (
    <View style={styles.flex}>
      <Header title="Settings" subtitle="Point the app at the box" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive">
        <Card>
          <Txt size={11} bold color={colors.textDim}>
            BACKEND
          </Txt>
          <Field
            label="Base URL"
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder={DEFAULT_BASE_URL}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Txt size={12} color={colors.textDim}>
            Resolves to {normalizeBaseUrl(urlDraft) || '—'}. A bare IP is fine; port 8080 is
            assumed. Must be the box's LAN address, reachable from this device.
          </Txt>

          <Field
            label="Learner id"
            value={idDraft}
            onChangeText={setIdDraft}
            placeholder="demo"
          />
          <Txt size={12} color={colors.textDim}>
            Keys the on-box memory: mastery, past mistakes, exam date. Nothing leaves the box.
          </Txt>

          <View style={styles.row}>
            <Btn label="Save" onPress={save} disabled={!dirty} style={styles.flex} />
            <Btn
              label="Reset"
              kind="ghost"
              onPress={() => {
                setUrlDraft(DEFAULT_BASE_URL);
                setIdDraft('demo');
              }}
              style={styles.flex}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.statusRow}>
            <Txt size={11} bold color={colors.textDim}>
              BOX STATUS
            </Txt>
            <View style={styles.statusRight}>
              <Dot color={health ? (health.warm ? colors.accent : colors.warn) : colors.danger} />
              <Txt size={12} color={colors.textDim}>
                {health ? (health.warm ? 'warm' : 'cold — next call pays a swap') : 'unreachable'}
              </Txt>
            </View>
          </View>

          {healthError ? <ErrorNote message={healthError} /> : null}

          {health ? (
            <View style={{ gap: 2 }}>
              <Row k="status" v={health.status} />
              <Row k="pinned model" v={health.pinned_model} />
              <Row k="resident model" v={health.resident_model ?? 'none'} />
              <Row k="warm" v={health.warm ? 'yes' : 'no'} />
              <Row k="offline mode" v={health.offline_mode ? 'on (no egress)' : 'off'} />
            </View>
          ) : null}

          <Btn
            label={healthChecking ? 'Checking…' : 'Check now'}
            kind="ghost"
            onPress={refreshHealth}
            busy={healthChecking}
          />
          {health && !health.warm ? (
            <Txt size={12} color={colors.warn}>
              Pre-warm before demoing: send one throwaway message and let it finish. A cold
              swap mid-pitch looks exactly like a hang.
            </Txt>
          ) : null}
        </Card>

        <Card>
          <Txt size={11} bold color={colors.textDim}>
            OFFLINE
          </Txt>
          <Txt size={13} color={colors.textDim}>
            This app makes no requests other than to the base URL above. Fonts are bundled,
            there is no analytics SDK and no remote images. Pull the cable — the only thing
            it needs is the box.
          </Txt>
        </Card>
      </ScrollView>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Txt size={13} color={colors.textDim}>
        {k}
      </Txt>
      <Txt size={13} numberOfLines={1} style={styles.kvValue}>
        {v}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  kvValue: { flexShrink: 1, textAlign: 'right' },
});
