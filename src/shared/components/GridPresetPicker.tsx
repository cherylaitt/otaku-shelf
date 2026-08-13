import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

interface GridPreset {
  value: number;
  label: string;
}

interface GridPresetPickerProps {
  label: string;
  hint?: string;
  presets: GridPreset[];
  value: number;
  onChange: (value: number) => void;
}

/**
 * Shared preset-picker UI for choosing a grid dimension (rows or columns) —
 * deliberately not a free-form number input, so the grid always renders
 * cleanly within a fixed-aspect-ratio background image. Used by both group
 * creation and the later "Resize Layout" flow, so the two always look and
 * behave identically.
 */
export function GridPresetPicker({ label, hint, presets, value, onChange }: GridPresetPickerProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.optionsRow}>
        {presets.map((preset) => {
          const selected = value === preset.value;
          return (
            <Pressable
              key={preset.value}
              onPress={() => onChange(preset.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.bgCard,
  },
  optionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: colors.textPrimary,
  },
});
