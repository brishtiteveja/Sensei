import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, CircleAlert, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/theme-context';
import { useAppTheme } from '@/theme';

export type AppToastType = 'success' | 'error' | 'info';

export type AppToastOptions = {
  type?: AppToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastState = Required<AppToastOptions>;

let toastHandler: ((options: AppToastOptions) => void) | null = null;

export function showAppToast(options: AppToastOptions) {
  toastHandler?.(options);
}

function getDefaultTitle(type: AppToastType) {
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    default:
      return 'Info';
  }
}

function ToastIcon({ type }: { type: AppToastType }) {
  const theme = useAppTheme();
  switch (type) {
    case 'success':
      return <CheckCircle2 size={18} color={theme.success} />;
    case 'error':
      return <CircleAlert size={18} color={theme.danger} />;
    default:
      return <Info size={18} color={theme.accent} />;
  }
}

export function AppToastViewport() {
  const { isDark } = useTheme();
  const theme = useAppTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [anim]);

  const showToast = useCallback((options: AppToastOptions) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const type = options.type ?? 'info';
    setToast({
      type,
      title: options.title ?? getDefaultTitle(type),
      message: options.message,
      duration: options.duration ?? 2600,
    });

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    hideTimerRef.current = setTimeout(() => {
      hideToast();
      hideTimerRef.current = null;
    }, options.duration ?? 2600);
  }, [anim, hideToast]);

  useEffect(() => {
    toastHandler = showToast;
    return () => {
      toastHandler = null;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [showToast]);

  if (!toast) return null;

  return (
    <SafeAreaView
      pointerEvents="none"
      className="absolute inset-x-0 top-0 z-[1000] px-4 pt-2"
    >
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-16, 0],
              }),
            },
          ],
        }}
      >
        <View
          className="rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            shadowOpacity: 0.14,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View className="flex-row items-start gap-3">
            <View className="pt-0.5">
              <ToastIcon type={toast.type} />
            </View>
            <View className="flex-1">
              <Text
                className={`font-space-semibold text-sm ${
                  isDark ? 'text-app-text-dark' : 'text-app-text'
                }`}
              >
                {toast.title}
              </Text>
              <Text
                className={`mt-0.5 font-space text-xs leading-5 ${
                  isDark ? 'text-app-text-muted-dark' : 'text-app-text-muted'
                }`}
              >
                {toast.message}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
