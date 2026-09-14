import { useState } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type FocusAwareStyle = StyleProp<ViewStyle> | ((state: { pressed: boolean; focused: boolean }) => StyleProp<ViewStyle>);

interface TVFocusableProps extends Omit<PressableProps, 'style'> {
  style?: FocusAwareStyle;
  focusStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_FOCUS_STYLE: ViewStyle = {
  transform: [{ scale: 1.06 }],
  borderColor: '#E6F4FE',
  borderWidth: 2,
};

// Pressable con estado de foco visible para navegacion por D-pad en Android/Apple TV.
export function TVFocusable({ style, focusStyle, onFocus, onBlur, ...rest }: TVFocusableProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      focusable={Platform.isTV}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={(state) => [
        typeof style === 'function' ? style({ pressed: state.pressed, focused }) : style,
        Platform.isTV && focused ? (focusStyle ?? DEFAULT_FOCUS_STYLE) : null,
      ]}
      {...rest}
    />
  );
}
