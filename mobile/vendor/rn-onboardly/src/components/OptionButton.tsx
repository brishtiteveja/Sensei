import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { OnboardlyOption, OnboardlyTheme } from '../types';

type Props = {
  option: OnboardlyOption;
  selected: boolean;
  onPress: () => void;
  theme: OnboardlyTheme;
  layout: 'grid' | 'list';
};

export const OptionButton: React.FC<Props> = ({
  option,
  selected,
  onPress,
  theme,
  layout,
}) => {
  const scale = useSharedValue(1);
  const pop = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };
  const handlePress = () => {
    pop.value = withSequence(
      withTiming(1.06, { duration: 120 }),
      withSpring(1, { damping: 8, stiffness: 180 })
    );
    onPress();
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pop.value }],
  }));

  const isGrid = layout === 'grid';

  return (
    <Animated.View
      style={[
        style,
        {
          marginBottom: 12,
          marginHorizontal: isGrid ? 6 : 0,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{
          backgroundColor: selected ? theme.cardSelected : theme.card,
          borderWidth: 2,
          borderColor: selected ? theme.borderSelected : theme.border,
          borderRadius: theme.borderRadius,
          padding: 16,
          alignItems: isGrid ? 'center' : 'center',
          flexDirection: isGrid ? 'column' : 'row',
          minHeight: isGrid ? 130 : 68,
          justifyContent: isGrid ? 'center' : 'flex-start',
        }}
      >
        {option.emoji ? (
          <Text
            style={{
              fontSize: isGrid ? 42 : 28,
              marginRight: isGrid ? 0 : 14,
              marginBottom: isGrid ? 10 : 0,
            }}
          >
            {option.emoji}
          </Text>
        ) : null}
        <View style={{ flex: isGrid ? 0 : 1 }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: '700',
              fontFamily: theme.fontFamilyBold,
              textAlign: isGrid ? 'center' : 'left',
            }}
          >
            {option.label}
          </Text>
          {option.description ? (
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 13,
                marginTop: 2,
                fontFamily: theme.fontFamily,
                textAlign: isGrid ? 'center' : 'left',
              }}
            >
              {option.description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};
