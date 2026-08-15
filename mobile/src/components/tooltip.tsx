import { useCallback, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme';

type TooltipPlacement = 'top' | 'bottom';
type TooltipAlign = 'left' | 'center' | 'right';

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TooltipProps = {
  content: string;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  align?: TooltipAlign;
  width?: number;
};

const SCREEN_PADDING = 16;
const TOOLTIP_OFFSET = 8;

export function Tooltip({
  content,
  children,
  placement = 'bottom',
  align = 'right',
  width = 224,
}: TooltipProps) {
  const theme = useAppTheme();
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);

  const measureAnchor = useCallback((nextVisible: boolean) => {
    anchorRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchorRect({ x, y, width: measuredWidth, height: measuredHeight });
      setVisible(nextVisible);
    });
  }, []);

  const showTooltip = useCallback(() => {
    measureAnchor(true);
  }, [measureAnchor]);

  const hideTooltip = useCallback(() => {
    setVisible(false);
  }, []);

  const toggleTooltip = useCallback(() => {
    if (visible) {
      hideTooltip();
      return;
    }
    showTooltip();
  }, [hideTooltip, showTooltip, visible]);

  const screenWidth = Dimensions.get('window').width;

  let tooltipLeft = SCREEN_PADDING;
  let tooltipTop = SCREEN_PADDING;

  if (anchorRect) {
    if (align === 'left') {
      tooltipLeft = anchorRect.x;
    } else if (align === 'center') {
      tooltipLeft = anchorRect.x + anchorRect.width / 2 - width / 2;
    } else {
      tooltipLeft = anchorRect.x + anchorRect.width - width;
    }

    tooltipLeft = Math.max(SCREEN_PADDING, Math.min(tooltipLeft, screenWidth - width - SCREEN_PADDING));

    tooltipTop = placement === 'top'
      ? anchorRect.y - TOOLTIP_OFFSET
      : anchorRect.y + anchorRect.height + TOOLTIP_OFFSET;
  }

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          onPress={toggleTooltip}
          onHoverIn={showTooltip}
          onHoverOut={hideTooltip}
          hitSlop={8}
        >
          {children}
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideTooltip}
      >
        <View className="flex-1">
          <Pressable className="absolute inset-0" onPress={hideTooltip} />
          {anchorRect ? (
            <View
              className="absolute rounded-xl px-3 py-2"
              style={{
                width,
                left: tooltipLeft,
                top: tooltipTop,
                backgroundColor: theme.heroBg,
              }}
            >
              <Text className="text-[11px] font-space-medium" style={{ color: theme.heroText }}>
                {content}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
