import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { useAppTheme } from '@/theme';

type SkeletonVariant =
  | 'list'
  | 'card'
  | 'detail'
  | 'avatarText'
  | 'image'
  | 'grid';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
}

function SkeletonBlock({
  width,
  height,
  radius,
  shimmer,
}: {
  width: DimensionValue;
  height: number;
  radius: number;
  shimmer: Animated.Value;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: theme.skeletonBase,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '38%',
          backgroundColor: theme.skeletonShimmer,
          transform: [{ translateX: shimmer }],
        }}
      />
    </View>
  );
}

function ListSkeleton({ shimmer, count }: { shimmer: Animated.Value; count: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`list-${index}`}
          className="rounded-[20px] px-4 py-4 border"
          style={{ borderColor: 'transparent' }}
        >
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={44} height={44} radius={14} shimmer={shimmer} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="68%" height={12} radius={6} shimmer={shimmer} />
              <SkeletonBlock width="42%" height={10} radius={6} shimmer={shimmer} />
            </View>
            <SkeletonBlock width={20} height={20} radius={10} shimmer={shimmer} />
          </View>
        </View>
      ))}
    </View>
  );
}

function CardSkeleton({ shimmer, count }: { shimmer: Animated.Value; count: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`card-${index}`}
          className="rounded-[22px] p-4 border"
          style={{ borderColor: 'transparent' }}
        >
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <SkeletonBlock width="54%" height={14} radius={7} shimmer={shimmer} />
              <SkeletonBlock width={52} height={20} radius={10} shimmer={shimmer} />
            </View>
            <SkeletonBlock width="82%" height={11} radius={6} shimmer={shimmer} />
            <SkeletonBlock width="74%" height={11} radius={6} shimmer={shimmer} />
            <View className="flex-row gap-3">
              <SkeletonBlock width="28%" height={10} radius={6} shimmer={shimmer} />
              <SkeletonBlock width="24%" height={10} radius={6} shimmer={shimmer} />
            </View>
            <SkeletonBlock width="100%" height={42} radius={14} shimmer={shimmer} />
          </View>
        </View>
      ))}
    </View>
  );
}

function DetailSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  return (
    <View className="gap-4">
      <SkeletonBlock width="100%" height={180} radius={24} shimmer={shimmer} />
      <View className="rounded-[22px] p-4 border gap-3" style={{ borderColor: 'transparent' }}>
        <SkeletonBlock width="62%" height={16} radius={8} shimmer={shimmer} />
        <SkeletonBlock width="88%" height={11} radius={6} shimmer={shimmer} />
        <SkeletonBlock width="76%" height={11} radius={6} shimmer={shimmer} />
        <View className="flex-row gap-3">
          <SkeletonBlock width="24%" height={28} radius={14} shimmer={shimmer} />
          <SkeletonBlock width="20%" height={28} radius={14} shimmer={shimmer} />
        </View>
      </View>
      <View className="gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`detail-row-${index}`} className="rounded-[20px] p-4 border gap-3" style={{ borderColor: 'transparent' }}>
            <SkeletonBlock width="72%" height={12} radius={6} shimmer={shimmer} />
            <SkeletonBlock width="100%" height={10} radius={6} shimmer={shimmer} />
            <SkeletonBlock width="90%" height={10} radius={6} shimmer={shimmer} />
          </View>
        ))}
      </View>
    </View>
  );
}

function AvatarTextSkeleton({ shimmer, count }: { shimmer: Animated.Value; count: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <View key={`avatar-${index}`} className="flex-row items-center gap-3">
          <SkeletonBlock width={40} height={40} radius={20} shimmer={shimmer} />
          <View className="flex-1 gap-2">
            <SkeletonBlock width="58%" height={11} radius={6} shimmer={shimmer} />
            <SkeletonBlock width="34%" height={10} radius={6} shimmer={shimmer} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ImageSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  return <SkeletonBlock width="100%" height={220} radius={24} shimmer={shimmer} />;
}

function GridSkeleton({ shimmer, count }: { shimmer: Animated.Value; count: number }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <View key={`grid-${index}`} style={{ width: '47.5%' }} className="rounded-[18px] p-4 border gap-3" >
          <SkeletonBlock width={18} height={18} radius={9} shimmer={shimmer} />
          <SkeletonBlock width="70%" height={18} radius={8} shimmer={shimmer} />
          <SkeletonBlock width="60%" height={12} radius={6} shimmer={shimmer} />
          <SkeletonBlock width="42%" height={10} radius={6} shimmer={shimmer} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonLoader({
  variant = 'list',
  count = 3,
}: SkeletonLoaderProps) {
  const shimmer = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 260,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmer]);

  if (variant === 'card') return <CardSkeleton shimmer={shimmer} count={count} />;
  if (variant === 'detail') return <DetailSkeleton shimmer={shimmer} />;
  if (variant === 'avatarText') return <AvatarTextSkeleton shimmer={shimmer} count={count} />;
  if (variant === 'image') return <ImageSkeleton shimmer={shimmer} />;
  if (variant === 'grid') return <GridSkeleton shimmer={shimmer} count={count} />;
  return <ListSkeleton shimmer={shimmer} count={count} />;
}
