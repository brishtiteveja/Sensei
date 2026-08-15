import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme } from '@/theme';

export type AppDialogAction = {
  label: string;
  variant?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

export type AppDialogOptions = {
  title: string;
  message: string;
  actions: AppDialogAction[];
};

let dialogHandler: ((options: AppDialogOptions) => void) | null = null;

export function showAppDialog(options: AppDialogOptions) {
  dialogHandler?.(options);
}

export function AppDialogViewport() {
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);

  const dismiss = useCallback(() => {
    setDialog(null);
  }, []);

  useEffect(() => {
    dialogHandler = (options) => {
      setDialog(options);
    };
    return () => {
      dialogHandler = null;
    };
  }, []);

  const cancelAction = useMemo(
    () => dialog?.actions.find((action) => action.variant === 'cancel') ?? null,
    [dialog],
  );

  const handleActionPress = useCallback((action: AppDialogAction) => {
    dismiss();
    queueMicrotask(() => {
      void action.onPress?.();
    });
  }, [dismiss]);

  const handleBackdropPress = useCallback(() => {
    if (cancelAction) {
      handleActionPress(cancelAction);
      return;
    }
    dismiss();
  }, [cancelAction, dismiss, handleActionPress]);

  if (!dialog) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleBackdropPress}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-6"
        onPress={handleBackdropPress}
      >
        <Pressable
          className="w-full max-w-[360px] rounded-[28px] border px-5 py-5"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          onPress={(event) => event.stopPropagation()}
        >
          <Text
            className={`font-space-bold text-lg ${
              isDark ? 'text-app-text-dark' : 'text-app-text'
            }`}
          >
            {dialog.title}
          </Text>
          <Text className="mt-2 font-space text-sm leading-6" style={{ color: theme.textSoft }}>
            {dialog.message}
          </Text>
          <View className="mt-5 gap-2">
            {dialog.actions.map((action) => {
              const isDestructive = action.variant === 'destructive';
              const isCancel = action.variant === 'cancel';
              return (
                <TouchableOpacity
                  key={`${action.label}-${action.variant ?? 'default'}`}
                  activeOpacity={0.82}
                  onPress={() => handleActionPress(action)}
                  className="h-11 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: isDestructive
                      ? theme.dangerBg
                      : isCancel
                        ? theme.surfaceAlt
                        : theme.heroBg,
                    borderColor: isDestructive
                      ? theme.danger
                      : isCancel
                        ? theme.border
                        : 'transparent',
                  }}
                >
                  <Text
                    className="font-space-semibold text-sm"
                    style={{
                      color: isDestructive
                        ? theme.dangerText
                        : isCancel
                          ? theme.textSoft
                          : theme.textInverse,
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
