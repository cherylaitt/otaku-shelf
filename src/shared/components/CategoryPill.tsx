import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Category, CATEGORY_LABELS } from '../types/models';
import { categoryColor, categorySoftColor, radius, spacing, typography } from '../theme/theme';

export function CategoryPill({ category, compact }: { category: Category; compact?: boolean }) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: categorySoftColor(category), borderColor: categoryColor(category) },
        compact && styles.compact,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: categoryColor(category) }]} />
      <Text style={[styles.label, { color: categoryColor(category) }, compact && styles.compactLabel]}>
        {CATEGORY_LABELS[category]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  compact: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: 11,
  },
});
