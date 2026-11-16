import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { Colors, Radius, Spacing, Layout } from '../theme/tokens';

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  textStyle,
  icon,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getContainerStyle = ({ pressed }: { pressed: boolean }): ViewStyle[] => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
      minHeight: Layout.minTouchTarget,
      paddingHorizontal: size === 'sm' ? Spacing.md : Spacing.lg,
      paddingVertical: size === 'sm' ? Spacing.sm : Spacing.md,
      opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
    };

    let variantStyle: ViewStyle = {};
    if (variant === 'primary') {
      variantStyle = { backgroundColor: Colors.primary };
    } else if (variant === 'secondary') {
      variantStyle = { backgroundColor: Colors.primaryLight };
    } else if (variant === 'outline') {
      variantStyle = {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
      };
    } else if (variant === 'danger') {
      variantStyle = { backgroundColor: Colors.error };
    }

    return [base, variantStyle, style || {}];
  };

  const getTextColor = (): string => {
    if (variant === 'primary' || variant === 'danger') return '#FFFFFF';
    if (variant === 'secondary' || variant === 'outline') return Colors.primary;
    return Colors.text;
  };

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={getContainerStyle}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                marginLeft: icon ? Spacing.sm : 0,
                fontSize: size === 'sm' ? 14 : 16,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
