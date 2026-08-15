import { Modal, View, Pressable } from 'react-native';
import { useAppTheme } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'slide' | 'none' | 'fade';
  backdropDismiss?: boolean;
  contentBackgroundColor?: string;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  animationType = 'slide',
  backdropDismiss = true,
  contentBackgroundColor,
}: BottomSheetProps) {
  const theme = useAppTheme();
  const sheetBackgroundColor = contentBackgroundColor ?? theme.surface;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: theme.sheetBackdrop }}
      >
        {backdropDismiss ? (
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: sheetBackgroundColor }}>
          {children}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
