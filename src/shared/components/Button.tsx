import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

const VARIANT_BG: Record<Variant, string> = {
  primary: colors.textPrimary,
  secondary: colors.bgCard,
  danger: colors.danger,
  ghost: 'transparent',
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary: colors.bg,
  secondary: colors.textPrimary,
  danger: '#FFFFFF',
  ghost: colors.textPrimary,
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, fullWidth }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: VARIANT_BG[variant] },
        variant === 'ghost' && styles.ghostBorder,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={VARIANT_TEXT[variant]} />
      ) : (
        <Text style={[styles.label, { color: VARIANT_TEXT[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBorder: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...typography.subtitle,
  },
});
