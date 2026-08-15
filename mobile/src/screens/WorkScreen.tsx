/**
 * Photograph handwritten work; the model reads it and finds the step where the student
 * slipped, then opens a tutoring turn from there.
 *
 * expo-image-picker covers both camera and library, so the app carries one media
 * dependency instead of two. The vision pass plus a completion runs 30-60s (longer from
 * cold), which is far past the point where a bare spinner reads as a hang -- hence the
 * running elapsed counter and an explicit statement of what is happening.
 */

import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import type { ImageUpload } from '../api/sensei';
import { Btn, Card, ErrorNote, Field, Header, Txt } from '../components/ui';
import { useStore } from '../state/store';
import { colors, radius, space } from '../theme';

export default function WorkScreen() {
  const { diagnosis, diagnosing, diagnoseError, runDiagnose, clearDiagnosis, pushTutorTurn, setTab } =
    useStore();

  const [image, setImage] = useState<ImageUpload | null>(null);
  const [problem, setProblem] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!diagnosing) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [diagnosing]);

  const accept = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    const name = a.fileName || `work-${Date.now()}.jpg`;
    setImage({
      uri: a.uri,
      name,
      // Falls back rather than trusting the picker: an empty content-type makes the
      // server guess, and the vision path needs a real mime.
      type: a.mimeType || (name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
    });
    clearDiagnosis();
    setShowRaw(false);
  };

  const takePhoto = async () => {
    setPickError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setPickError('Camera permission denied. Enable it in system settings, or pick from the library.');
      return;
    }
    accept(
      await ImagePicker.launchCameraAsync({
        quality: 0.7, // smaller upload; handwriting stays legible well below full res
        allowsEditing: false,
      }),
    );
  };

  const pickPhoto = async () => {
    setPickError(null);
    accept(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      }),
    );
  };

  return (
    <View style={styles.flex}>
      <Header title="Check my work" subtitle="Photograph what you wrote — the tutor finds the slip" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive">
        <View style={styles.row}>
          <Btn label="Take photo" onPress={takePhoto} style={styles.flex} disabled={diagnosing} />
          <Btn label="Choose" kind="ghost" onPress={pickPhoto} style={styles.flex} disabled={diagnosing} />
        </View>

        {pickError ? <ErrorNote message={pickError} /> : null}

        {image ? (
          <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Txt size={13} color={colors.textDim}>
              No photo yet. Straight-on, good light, one problem per shot.
            </Txt>
          </View>
        )}

        <Field
          label="The problem (optional — helps the model check the maths)"
          value={problem}
          onChangeText={setProblem}
          placeholder="e.g. A ball is thrown at 20 m/s at 30°…"
          multiline
          autoCapitalize="sentences"
          autoCorrect
          style={{ minHeight: 70 }}
          editable={!diagnosing}
        />

        <Btn
          label={diagnosing ? 'Reading your work…' : 'Find my mistake'}
          onPress={() => image && runDiagnose(image, problem)}
          disabled={!image || diagnosing}
          busy={false}
        />

        {diagnosing ? (
          <Card>
            <Txt size={14} bold>
              Reading the handwriting… {elapsed}s
            </Txt>
            <Txt size={13} color={colors.textDim}>
              Vision pass plus a tutoring turn. Normally 30-60 seconds; if the model was
              not resident this also covers a cold load and can take several minutes.
              Leaving this tab will not cancel it.
            </Txt>
          </Card>
        ) : null}

        {diagnoseError ? <ErrorNote message={diagnoseError} /> : null}

        {diagnosis ? (
          <>
            <Card style={styles.opening}>
              <Txt size={11} bold color={colors.accent}>
                THE TUTOR ASKS
              </Txt>
              <Txt size={17} selectable>
                {diagnosis.tutor_opening}
              </Txt>
            </Card>

            <Btn
              label="Continue in chat"
              onPress={() => {
                pushTutorTurn(diagnosis.tutor_opening);
                setTab('chat');
              }}
            />

            <Btn
              label={showRaw ? 'Hide the raw analysis' : 'Show the raw analysis'}
              kind="ghost"
              onPress={() => setShowRaw((v) => !v)}
            />
            {showRaw ? (
              <Card>
                <Txt size={13} color={colors.textDim} selectable>
                  {diagnosis.diagnosis}
                </Txt>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  row: { flexDirection: 'row', gap: space.sm },
  preview: {
    width: '100%',
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: {
    height: 140,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  opening: { borderColor: colors.accentDim },
});
