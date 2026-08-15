import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, Cloud, Cpu, Eye, EyeOff, TriangleAlert, X } from 'lucide-react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { adminApi, getApiErrorMessage } from '@/api';
import { useI18n } from '@/i18n/i18n-context';
import { useAppTheme } from '@/theme';
import type { SemanticTokens } from '@/theme/tokens';
import type {
  LocalModelOption,
  ModelCatalog,
  ModelMode,
  SetModelResult,
} from '@/api/admin';

type PendingChoice = {
  mode: ModelMode;
  id: string;
  label: string;
  /** True when the backend has to load weights from disk (1-5 minutes). */
  coldSwap: boolean;
  vision: boolean | null;
};

function Badge({
  label,
  color,
  background,
  icon,
}: {
  label: string;
  color: string;
  background: string;
  icon?: React.ReactNode;
}) {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2 py-1"
      style={{ backgroundColor: background }}
    >
      {icon}
      <Text className="text-[10px] font-space-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function ModelRow({
  label,
  note,
  badges,
  selected,
  disabled,
  theme,
  onPress,
}: {
  label: string;
  note?: string | null;
  badges: React.ReactNode;
  selected: boolean;
  disabled: boolean;
  theme: SemanticTokens;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      className="rounded-2xl border px-4 py-3"
      style={{
        opacity: disabled ? 0.6 : 1,
        borderColor: selected ? theme.accent : theme.borderStrong,
        backgroundColor: selected ? theme.accentSoft : theme.surface,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text
            className="text-sm font-space-semibold"
            style={{ color: selected ? theme.accent : theme.text }}
          >
            {label}
          </Text>
          {note ? (
            <Text className="mt-0.5 text-[11px] font-space" style={{ color: theme.textMuted }}>
              {note}
            </Text>
          ) : null}
          <View className="mt-2 flex-row flex-wrap gap-1.5">{badges}</View>
        </View>
        {selected ? <Check size={18} color={theme.accent} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export function ModelSelectorModal({
  visible,
  catalog,
  onClose,
  onSwitched,
}: {
  visible: boolean;
  catalog: ModelCatalog | null;
  onClose: () => void;
  onSwitched: (result: SetModelResult) => void;
}) {
  const { t } = useI18n();
  const theme = useAppTheme();
  const [pending, setPending] = useState<PendingChoice | null>(null);
  const [switching, setSwitching] = useState<PendingChoice | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setPending(null);
      setError('');
    }
  }, [visible]);

  const isBusy = switching !== null;

  const handleClose = useCallback(() => {
    // A cold swap keeps running on the server; closing mid-flight would strip the
    // only progress indication the user has.
    if (isBusy) return;
    onClose();
  }, [isBusy, onClose]);

  const apply = useCallback(
    async (choice: PendingChoice) => {
      setPending(null);
      setSwitching(choice);
      setError('');
      try {
        const result = await adminApi.setActiveModel(choice.mode, choice.id);
        setSwitching(null);
        onSwitched(result);
      } catch (err) {
        setSwitching(null);
        setError(getApiErrorMessage(err));
      }
    },
    [onSwitched],
  );

  const choose = useCallback(
    (choice: PendingChoice) => {
      if (isBusy) return;
      if (choice.coldSwap) {
        setPending(choice);
        return;
      }
      void apply(choice);
    },
    [apply, isBusy],
  );

  const current = catalog?.current;
  const resident = catalog?.residentLocalModel ?? null;

  const localBadges = (option: LocalModelOption) => (
    <>
      {resident === option.id ? (
        <Badge
          label={t('modelSelector.loadedNoWait')}
          color={theme.successText}
          background={theme.successBg}
        />
      ) : (
        <Badge
          label={t('modelSelector.coldSwap')}
          color={theme.warningText}
          background={theme.warningBg}
        />
      )}
      {option.vision ? (
        <Badge
          label={t('modelSelector.vision')}
          color={theme.infoText}
          background={theme.infoBg}
          icon={<Eye size={11} color={theme.infoText} />}
        />
      ) : (
        <Badge
          label={t('modelSelector.textOnly')}
          color={theme.textMuted}
          background={theme.surfaceAlt}
          icon={<EyeOff size={11} color={theme.textMuted} />}
        />
      )}
    </>
  );

  return (
    <BottomSheet visible={visible} onClose={handleClose} backdropDismiss={!isBusy}>
      <View className="px-5 pb-4 pt-5" style={{ maxHeight: 560 }}>
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-space-bold" style={{ color: theme.text }}>
              {t('modelSelector.modalTitle')}
            </Text>
            {current ? (
              <Text className="mt-1 text-[11px] font-space" style={{ color: theme.textMuted }}>
                {t('modelSelector.currentlyUsing', { model: current.model })}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleClose}
            disabled={isBusy}
            activeOpacity={0.8}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.surfaceAlt, opacity: isBusy ? 0.5 : 1 }}
          >
            <X size={18} color={theme.textSoft} />
          </TouchableOpacity>
        </View>

        {switching ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator size="large" color={theme.accentStrong} />
            <Text className="text-sm font-space-bold" style={{ color: theme.text }}>
              {t('modelSelector.switching')}
            </Text>
            <Text
              className="px-4 text-center text-xs font-space"
              style={{ color: theme.textMuted }}
            >
              {t('modelSelector.switchingHint')}
            </Text>
            <Text className="text-xs font-space-semibold" style={{ color: theme.textSoft }}>
              {switching.label}
            </Text>
          </View>
        ) : pending ? (
          <View className="gap-3 py-2">
            <View
              className="flex-row items-start gap-2 rounded-2xl p-4"
              style={{ backgroundColor: theme.warningBg }}
            >
              <TriangleAlert size={18} color={theme.warningText} />
              <View className="flex-1">
                <Text className="text-sm font-space-bold" style={{ color: theme.warningText }}>
                  {t('modelSelector.confirmTitle', { model: pending.label })}
                </Text>
                <Text
                  className="mt-1 text-xs font-space"
                  style={{ color: theme.warningText }}
                >
                  {t('modelSelector.confirmBody')}
                </Text>
                {catalog?.localSwapWarning ? (
                  <Text
                    className="mt-2 text-[11px] font-space"
                    style={{ color: theme.warningText }}
                  >
                    {catalog.localSwapWarning}
                  </Text>
                ) : null}
                {pending.vision === false ? (
                  <Text
                    className="mt-2 text-[11px] font-space-semibold"
                    style={{ color: theme.warningText }}
                  >
                    {t('modelSelector.noVisionHint')}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setPending(null)}
                activeOpacity={0.85}
                className="h-12 flex-1 items-center justify-center rounded-2xl border"
                style={{ borderColor: theme.borderStrong, backgroundColor: theme.surface }}
              >
                <Text className="text-sm font-space-semibold" style={{ color: theme.textSoft }}>
                  {t('modelSelector.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void apply(pending);
                }}
                activeOpacity={0.85}
                className="h-12 flex-1 items-center justify-center rounded-2xl"
                style={{ backgroundColor: theme.accentStrong }}
              >
                <Text className="text-sm font-space-bold text-white">
                  {t('modelSelector.confirmSwitch')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {error ? (
              <View
                className="mb-3 flex-row items-center gap-2 rounded-2xl p-3"
                style={{ backgroundColor: theme.dangerBg }}
              >
                <TriangleAlert size={16} color={theme.dangerText} />
                <Text className="flex-1 text-xs font-space" style={{ color: theme.dangerText }}>
                  {t('modelSelector.switchFailed')} — {error}
                </Text>
              </View>
            ) : null}

            <View className="mb-2 flex-row items-center gap-2">
              <Cloud size={14} color={theme.textMuted} />
              <Text
                className="text-xs font-space-semibold uppercase"
                style={{ color: theme.textMuted }}
              >
                {t('modelSelector.cloudGroup')}
              </Text>
            </View>
            <View className="gap-2">
              {catalog?.cloud.length ? (
                catalog.cloud.map((option) => (
                  <ModelRow
                    key={option.id}
                    label={option.label}
                    note={option.note}
                    badges={
                      <Badge
                        label={t('modelSelector.modeCloud')}
                        color={theme.infoText}
                        background={theme.infoBg}
                      />
                    }
                    selected={current?.mode === 'cloud' && current.model === option.id}
                    disabled={isBusy}
                    theme={theme}
                    onPress={() =>
                      choose({
                        mode: 'cloud',
                        id: option.id,
                        label: option.label,
                        coldSwap: false,
                        vision: null,
                      })
                    }
                  />
                ))
              ) : (
                <Text className="text-xs font-space" style={{ color: theme.textMuted }}>
                  {t('modelSelector.noModels')}
                </Text>
              )}
            </View>

            <View className="mb-2 mt-5 flex-row items-center gap-2">
              <Cpu size={14} color={theme.textMuted} />
              <Text
                className="text-xs font-space-semibold uppercase"
                style={{ color: theme.textMuted }}
              >
                {t('modelSelector.localGroup')}
              </Text>
            </View>
            {catalog?.localSwapWarning ? (
              <Text className="mb-2 text-[11px] font-space" style={{ color: theme.textMuted }}>
                {catalog.localSwapWarning}
              </Text>
            ) : null}
            <View className="gap-2 pb-2">
              {catalog?.local.length ? (
                catalog.local.map((option) => (
                  <ModelRow
                    key={option.id}
                    label={option.label}
                    badges={localBadges(option)}
                    selected={current?.mode === 'local' && current.model === option.id}
                    disabled={isBusy}
                    theme={theme}
                    onPress={() =>
                      choose({
                        mode: 'local',
                        id: option.id,
                        label: option.label,
                        coldSwap: resident !== option.id,
                        vision: option.vision,
                      })
                    }
                  />
                ))
              ) : (
                <Text className="text-xs font-space" style={{ color: theme.textMuted }}>
                  {t('modelSelector.noModels')}
                </Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
