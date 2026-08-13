import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  scrollable,
}: SegmentedControlProps<T>) {
  const content = (
    <View style={styles.track}>
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            onPress={() => onChange(seg.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{seg.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {content}
      </ScrollView>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  segment: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.bg,
  },
});
