import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SkeletonLoader } from '@/components/skeleton-loader';
import { useAppTheme } from '@/theme';
import { useTheme } from '@/contexts/theme-context';
import { getApiErrorMessage, questionBankApi } from '@/api';
import type { QuestionBankUniversity } from '@/types';
import { X } from 'lucide-react-native';

interface PreferencesSetupModalProps {
  visible: boolean;
  saving: boolean;
  initialUniversityIds?: string[];
  initialSubjectIds?: string[];
  dismissible?: boolean;
  onClose?: () => void;
  onSave: (payload: {
    preferredUniversityIds: string[];
    preferredSubjectIds: string[];
  }) => Promise<void>;
}

function SectionCard({
  title,
  children,
  theme,
}: {
  title: string;
  children: ReactNode;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: theme.surfaceAlt }}
    >
      <Text
        className="text-xs font-space-semibold mb-3"
        style={{ color: theme.textSoft }}
      >
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function SelectableButton({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="px-4 py-3 rounded-2xl border-2"
      style={{
        backgroundColor: selected ? theme.accent : theme.surface,
        borderColor: selected ? theme.accent : theme.borderStrong,
      }}
    >
      <Text
        className="text-sm font-space-semibold"
        style={{ color: selected ? theme.textInverse : theme.textSoft }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function PreferencesSetupModal({
  visible,
  saving,
  initialUniversityIds = [],
  initialSubjectIds = [],
  dismissible = false,
  onClose,
  onSave,
}: PreferencesSetupModalProps) {
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const pageBg = isDark ? 'bg-app-bg-dark' : 'bg-app-bg';
  const primaryText = isDark ? 'text-app-text-dark' : 'text-app-text';
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const [universities, setUniversities] = useState<QuestionBankUniversity[]>([]);
  const [selectedUniversityIds, setSelectedUniversityIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const canDismiss = dismissible && Boolean(onClose);

  // Collect all unique subjects across all universities
  const allSubjects = useMemo(() => {
    const seen = new Set<string>();
    const subjects: { id: string; name: string; icon: string }[] = [];
    for (const uni of universities) {
      for (const subject of uni.subjects) {
        if (!seen.has(subject.name)) {
          seen.add(subject.name);
          subjects.push(subject);
        }
      }
    }
    return subjects;
  }, [universities]);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(0);
    }
  }, [sheetTranslateY, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    async function loadUniversities() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await questionBankApi.getUniversities();
        if (cancelled) return;
        setUniversities(data);

        // Restore previously saved selections
        const validUniIds = data
          .filter((u) => initialUniversityIds.includes(u.id))
          .map((u) => u.id);
        setSelectedUniversityIds(validUniIds);

        const allSubjectIds = new Set(
          data.flatMap((u) => u.subjects.map((s) => s.id)),
        );
        setSelectedSubjectIds(
          initialSubjectIds.filter((id) => allSubjectIds.has(id)),
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUniversities();
    return () => {
      cancelled = true;
    };
  }, [visible, initialUniversityIds, initialSubjectIds]);

  const toggleUniversity = useCallback((universityId: string) => {
    setSelectedUniversityIds((prev) =>
      prev.includes(universityId)
        ? prev.filter((id) => id !== universityId)
        : [...prev, universityId],
    );
  }, []);

  const toggleSubject = useCallback((subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  }, []);

  const canSave =
    !saving &&
    (selectedUniversityIds.length > 0 || selectedSubjectIds.length > 0);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await onSave({
      preferredUniversityIds: selectedUniversityIds,
      preferredSubjectIds: selectedSubjectIds,
    });
  }, [onSave, canSave, selectedSubjectIds, selectedUniversityIds]);

  const handleClose = useCallback(() => {
    if (!canDismiss || !onClose) return;
    sheetTranslateY.setValue(0);
    onClose();
  }, [canDismiss, onClose, sheetTranslateY]);

  const handleDragDismiss = useCallback(() => {
    if (!canDismiss || !onClose) return;
    Animated.timing(sheetTranslateY, {
      toValue: 480,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      sheetTranslateY.setValue(0);
      onClose();
    });
  }, [canDismiss, onClose, sheetTranslateY]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        canDismiss &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        gestureState.dy > 6,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldDismiss = gestureState.dy > 90 || gestureState.vy > 0.75;
        if (shouldDismiss) {
          handleDragDismiss();
          return;
        }
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    }),
    [canDismiss, handleDragDismiss, sheetTranslateY],
  );

  return (
    <BottomSheet visible={visible} onClose={handleClose} backdropDismiss={canDismiss} contentBackgroundColor={theme.page}>
        <Animated.View
          className={`rounded-t-[28px] px-5 pt-5 pb-7 ${pageBg}`}
          style={{ minHeight: '66%', maxHeight: '90%', transform: [{ translateY: sheetTranslateY }] }}
        >
          <View className="items-center mb-4" {...panResponder.panHandlers}>
            <View className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.border }} />
          </View>

          <View className="flex-row items-center justify-between mb-1">
            <Text
              className={`text-lg font-space-bold ${primaryText}`}
            >
              Set Your Preferences
            </Text>
            {canDismiss ? (
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text className="text-xs font-space mt-1 mb-4" style={{ color: theme.textMuted }}>
            Choose your target universities and subjects to personalize practice.
          </Text>

          {loading ? (
            <View className="py-2">
              <SkeletonLoader variant="list" count={4} />
            </View>
          ) : loadError ? (
            <View className="items-center py-10">
              <Text className="text-xs font-space" style={{ color: theme.danger }}>{loadError}</Text>
            </View>
          ) : (
            <>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 12, gap: 12 }}
                showsVerticalScrollIndicator={false}
              >
                <SectionCard title="Universities" theme={theme}>
                  {universities.map((university) => (
                    <SelectableButton
                      key={university.id}
                      label={university.shortName}
                      selected={selectedUniversityIds.includes(university.id)}
                      onPress={() => toggleUniversity(university.id)}
                      theme={theme}
                    />
                  ))}
                </SectionCard>

                <SectionCard title="Subjects" theme={theme}>
                  {allSubjects.map((subject) => (
                    <SelectableButton
                      key={subject.id}
                      label={`${subject.icon} ${subject.name}`}
                      selected={selectedSubjectIds.includes(subject.id)}
                      onPress={() => toggleSubject(subject.id)}
                      theme={theme}
                    />
                  ))}
                </SectionCard>
              </ScrollView>

              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={!canSave}
                className="rounded-2xl mt-4 bg-app-brand"
                style={{
                  opacity: canSave ? 1 : 0.6,
                }}
              >
                <View className="py-3.5 items-center justify-center flex-row gap-2">
                  {saving ? (
                    <ActivityIndicator size="small" color={theme.textInverse} />
                  ) : null}
                  <Text className="text-white font-space-semibold text-sm">
                    Save Preferences
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
    </BottomSheet>
  );
}
