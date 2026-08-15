import React, { Component, Suspense } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';

class DrawingErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function DrawingFallback({ onClose }: { onClose?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F5F5F5' }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>✏️</Text>
      <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
        Drawing canvas needs a dev build.{'\n'}Not available in Expo Go.
      </Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: '#7C3AED' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DrawingLoading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}

const LazyDrawingCanvas = React.lazy(() =>
  import('./drawing-canvas')
    .then(mod => ({ default: mod.DrawingCanvas }))
    .catch(() => ({ default: DrawingFallback as any }))
);

export function DrawingCanvasSafe(props: any) {
  return (
    <DrawingErrorBoundary fallback={<DrawingFallback onClose={props.onClose} />}>
      <Suspense fallback={<DrawingLoading />}>
        <LazyDrawingCanvas {...props} />
      </Suspense>
    </DrawingErrorBoundary>
  );
}
