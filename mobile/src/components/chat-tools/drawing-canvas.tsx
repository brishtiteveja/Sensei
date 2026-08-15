import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Canvas, Path, Skia, useCanvasRef } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { X, Send, Undo2, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { showAppDialog } from '@/feedback/dialog';

import type { SkPath as SkPathType } from '@shopify/react-native-skia';

interface DrawingCanvasProps {
  visible: boolean;
  onClose: () => void;
  onSend: (imageUri: string) => void;
}

interface DrawPath {
  path: SkPathType;
  color: string;
  strokeWidth: number;
}

const PRESET_COLORS = [
  '#000000', // black
  '#E85D4A', // red
  '#4A9FE8', // blue
  '#1B7A5A', // green
  '#E8924A', // orange
  '#7C5CBF', // purple
];

const STROKE_SIZES = [
  { label: 'thin', width: 2, display: 8 },
  { label: 'medium', width: 4, display: 14 },
  { label: 'thick', width: 8, display: 20 },
];

export function DrawingCanvas({ visible, onClose, onSend }: DrawingCanvasProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const canvasRef = useCanvasRef();

  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [exporting, setExporting] = useState(false);

  // Use refs for gesture callbacks to avoid stale closures
  const strokeColorRef = useRef(strokeColor);
  strokeColorRef.current = strokeColor;
  const strokeWidthRef = useRef(strokeWidth);
  strokeWidthRef.current = strokeWidth;
  const currentPathRef = useRef<DrawPath | null>(null);

  const hasContent = paths.length > 0;

  const handleUndo = useCallback(() => {
    if (paths.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaths((prev) => prev.slice(0, -1));
  }, [paths.length]);

  const handleClear = useCallback(() => {
    if (paths.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAppDialog({
      title: t('chatTools.drawClear'),
      message: t('chatTools.drawClear') + '?',
      actions: [
        { label: t('chatTools.close'), variant: 'cancel' },
        {
          label: t('chatTools.drawClear'),
          variant: 'destructive',
          onPress: () => {
            setPaths([]);
          },
        },
      ],
    });
  }, [paths.length, t]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || paths.length === 0) return;
    setExporting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Try async first, fall back to sync
      let image;
      try {
        image = await canvasRef.current.makeImageSnapshotAsync();
      } catch {
        image = canvasRef.current.makeImageSnapshot();
      }

      if (!image) {
        setExporting(false);
        return;
      }

      const base64 = image.encodeToBase64();
      const uri = `data:image/png;base64,${base64}`;
      onSend(uri);
    } catch {
      // Export failed silently
    } finally {
      setExporting(false);
    }
  }, [canvasRef, paths.length, onSend]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setPaths([]);
    setStrokeColor('#000000');
    setStrokeWidth(4);
    currentPathRef.current = null;
    onClose();
  }, [onClose]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const skPath = Skia.Path.Make();
      skPath.moveTo(e.x, e.y);
      const newPath: DrawPath = {
        path: skPath,
        color: strokeColorRef.current,
        strokeWidth: strokeWidthRef.current,
      };
      currentPathRef.current = newPath;
      setPaths((prev) => [...prev, newPath]);
    })
    .onUpdate((e) => {
      const current = currentPathRef.current;
      if (current) {
        current.path.lineTo(e.x, e.y);
        // Force re-render by creating new array reference
        setPaths((prev) => [...prev]);
      }
    })
    .onEnd(() => {
      currentPathRef.current = null;
    })
    .onFinalize(() => {
      currentPathRef.current = null;
    });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.surface,
          }}
        >
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            accessibilityLabel={t('chatTools.close')}
            accessibilityRole="button"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.surfaceAlt,
            }}
          >
            <X size={18} color={theme.textSoft} />
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Bold',
              fontSize: 17,
              color: theme.text,
            }}
          >
            {t('chatTools.drawTitle')}
          </Text>

          <TouchableOpacity
            onPress={() => void handleExport()}
            activeOpacity={hasContent ? 0.7 : 1}
            disabled={!hasContent || exporting}
            accessibilityLabel={t('chatTools.drawSend')}
            accessibilityRole="button"
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: hasContent ? theme.accentStrong : theme.accentDisabled,
            }}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={theme.textInverse} />
            ) : (
              <>
                <Send size={14} color={theme.textInverse} />
                <Text
                  style={{
                    fontFamily: 'SpaceGrotesk-SemiBold',
                    fontSize: 13,
                    color: theme.textInverse,
                  }}
                >
                  {t('chatTools.drawSend')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Canvas Area */}
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <GestureDetector gesture={pan}>
            <Canvas ref={canvasRef} style={{ flex: 1 }}>
              {paths.map((p, i) => (
                <Path
                  key={i}
                  path={p.path}
                  color={p.color}
                  style="stroke"
                  strokeWidth={p.strokeWidth}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}
            </Canvas>
          </GestureDetector>
        </View>

        {/* Bottom Toolbar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.surface,
            gap: 12,
          }}
        >
          {/* Color Picker Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStrokeColor(color);
                }}
                accessibilityLabel={`Color ${color}`}
                accessibilityRole="button"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: color,
                  borderWidth: strokeColor === color ? 3 : 1.5,
                  borderColor:
                    strokeColor === color ? theme.accent : theme.border,
                  // Add ring effect for selected color
                  ...(strokeColor === color
                    ? {
                        shadowColor: theme.accent,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 3,
                      }
                    : {}),
                }}
              />
            ))}
          </View>

          {/* Stroke Width + Actions Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Stroke Width Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {STROKE_SIZES.map((size) => (
                <TouchableOpacity
                  key={size.label}
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setStrokeWidth(size.width);
                  }}
                  accessibilityLabel={`Stroke ${size.label}`}
                  accessibilityRole="button"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: strokeWidth === size.width ? 2 : 1,
                    borderColor:
                      strokeWidth === size.width
                        ? theme.accent
                        : theme.border,
                    backgroundColor:
                      strokeWidth === size.width
                        ? theme.accentSoft
                        : theme.surfaceAlt,
                  }}
                >
                  <View
                    style={{
                      width: size.display,
                      height: size.display,
                      borderRadius: size.display / 2,
                      backgroundColor: strokeColor,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Undo + Clear */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                activeOpacity={hasContent ? 0.7 : 1}
                disabled={!hasContent}
                onPress={handleUndo}
                accessibilityLabel="Undo"
                accessibilityRole="button"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.surfaceAlt,
                  opacity: hasContent ? 1 : 0.4,
                }}
              >
                <Undo2 size={18} color={theme.textSoft} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={hasContent ? 0.7 : 1}
                disabled={!hasContent}
                onPress={handleClear}
                accessibilityLabel={t('chatTools.drawClear')}
                accessibilityRole="button"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.surfaceAlt,
                  opacity: hasContent ? 1 : 0.4,
                }}
              >
                <Trash2 size={18} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
