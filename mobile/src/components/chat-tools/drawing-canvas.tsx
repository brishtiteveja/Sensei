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
import {
  X,
  Send,
  Undo2,
  Trash2,
  Pencil,
  Minus,
  Square as SquareIcon,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  ArrowUpRight,
  Eraser,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme';
import { useI18n } from '@/i18n/i18n-context';
import { showAppDialog } from '@/feedback/dialog';
import { observe } from '@/lib/observe';
import { buildShapePath, PAPER as ERASER_PAPER, type Pt, type Tool } from '@/lib/strokes';

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
  tool: Tool;
  /**
   * The same stroke as plain geometry.
   *
   * An SkPath is an opaque native object: it cannot be serialised, stored, or
   * redrawn later, which would make the drawing unrecordable. Keeping the
   * points alongside costs a few hundred bytes a stroke and is what lets a
   * session be replayed, summarised, and shown to a vision model afterwards.
   * Freehand keeps every point; a shape is defined by its two corners.
   */
  points: Pt[];
}

const DRAW_TOOLS: { tool: Tool; Icon: typeof Pencil; label: string }[] = [
  { tool: 'pen', Icon: Pencil, label: 'Pen' },
  { tool: 'line', Icon: Minus, label: 'Line' },
  { tool: 'rect', Icon: SquareIcon, label: 'Rectangle' },
  { tool: 'circle', Icon: CircleIcon, label: 'Circle' },
  { tool: 'triangle', Icon: TriangleIcon, label: 'Triangle' },
  { tool: 'arrow', Icon: ArrowUpRight, label: 'Arrow' },
  { tool: 'eraser', Icon: Eraser, label: 'Eraser' },
];

/**
 * Drop points that add nothing. Keeps the first and last (a stroke's ends are
 * what shapes read from) and any point far enough from the last kept one to
 * change the line.
 */
function thin(points: Pt[], minDist = 3, max = 120): Pt[] {
  if (points.length <= 2) return points;
  const out: Pt[] = [points[0]];
  for (const p of points.slice(1, -1)) {
    const last = out[out.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= minDist) out.push(p);
  }
  out.push(points[points.length - 1]);
  if (out.length <= max) return out;
  // Still too long: keep an evenly spaced subset rather than truncating, so
  // the tail of the stroke is not lost.
  const step = Math.ceil(out.length / max);
  return out.filter((_, i) => i % step === 0 || i === out.length - 1);
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
  const [tool, setTool] = useState<Tool>('pen');
  const [exporting, setExporting] = useState(false);

  // Use refs for gesture callbacks to avoid stale closures
  const strokeColorRef = useRef(strokeColor);
  strokeColorRef.current = strokeColor;
  const strokeWidthRef = useRef(strokeWidth);
  strokeWidthRef.current = strokeWidth;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const currentPathRef = useRef<DrawPath | null>(null);
  const startRef = useRef<Pt>({ x: 0, y: 0 });
  // Recorded with every stroke: replay renders into a different-sized surface
  // on a different device, so the drawing space has to be part of the record.
  const sizeRef = useRef({ w: 0, h: 0 });

  const hasContent = paths.length > 0;

  const handleUndo = useCallback(() => {
    if (paths.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    observe('sketch.undo');
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
            observe('sketch.clear');
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
      observe('sketch.insert', { strokes: paths.length });
      onSend(uri);
    } catch {
      // Export failed silently
    } finally {
      setExporting(false);
    }
  }, [canvasRef, paths, onSend]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setPaths([]);
    setStrokeColor('#000000');
    setStrokeWidth(4);
    setTool('pen');
    currentPathRef.current = null;
    onClose();
  }, [onClose]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const activeTool = toolRef.current;
      const isEraser = activeTool === 'eraser';
      startRef.current = { x: e.x, y: e.y };
      const skPath = Skia.Path.Make();
      // Freehand seeds the path with its first point; shapes are rebuilt whole
      // on each update from the start point, so they start empty.
      if (activeTool === 'pen' || isEraser) skPath.moveTo(e.x, e.y);
      const newPath: DrawPath = {
        path: skPath,
        // The eraser is just a fat white brush on white paper.
        color: isEraser ? ERASER_PAPER : strokeColorRef.current,
        strokeWidth: isEraser ? Math.max(strokeWidthRef.current * 4, 16) : strokeWidthRef.current,
        tool: activeTool,
        points: [{ x: e.x, y: e.y }],
      };
      currentPathRef.current = newPath;
      setPaths((prev) => [...prev, newPath]);
    })
    .onUpdate((e) => {
      const current = currentPathRef.current;
      if (!current) return;
      if (current.tool === 'pen' || current.tool === 'eraser') {
        current.path.lineTo(e.x, e.y);
        current.points.push({ x: e.x, y: e.y });
      } else {
        current.path = buildShapePath(current.tool, startRef.current, { x: e.x, y: e.y });
        // A shape is its start and its current corner, nothing between.
        current.points = [startRef.current, { x: e.x, y: e.y }];
      }
      // Force re-render by creating new array reference
      setPaths((prev) => [...prev]);
    })
    .onEnd(() => {
      const done = currentPathRef.current;
      currentPathRef.current = null;
      if (!done) return;
      /*
       * One event per committed stroke -- not per gesture frame, which would
       * bury the log in noise. Points are thinned first: at 120 Hz a single
       * swipe lands hundreds of samples, and every third one redraws the same
       * curve to the eye and to a vision model.
       */
      observe('sketch.shape', {
        tool: done.tool,
        color: done.color,
        width: done.strokeWidth,
        points: thin(done.points).map((p) => [Math.round(p.x), Math.round(p.y)]),
        w: Math.round(sizeRef.current.w),
        h: Math.round(sizeRef.current.h),
      });
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
            <Canvas
              ref={canvasRef}
              style={{ flex: 1 }}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                sizeRef.current = { w: width, h: height };
              }}
            >
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
          {/* Tool Selector Row — pen, shapes, eraser */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {DRAW_TOOLS.map(({ tool: tl, Icon, label }) => {
              const active = tool === tl;
              return (
                <TouchableOpacity
                  key={tl}
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setTool(tl);
                  }}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.accent : theme.surfaceAlt,
                  }}
                >
                  <Icon size={18} color={active ? theme.textInverse : theme.textSoft} />
                </TouchableOpacity>
              );
            })}
          </View>

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
