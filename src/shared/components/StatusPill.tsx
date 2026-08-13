import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ItemStatus, ITEM_STATUS_LABELS } from '../types/models';
import { colors, radius, spacing, typography } from '../theme/theme';

const STATUS_COLORS: Record<ItemStatus, string> = {
  owned: colors.success,
  wishlist: colors.figure,
  'on-order': colors.warning,
  sold: colors.textMuted,
};

export function StatusPill({ status }: { status: ItemStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[styles.text, { color }]}>{ITEM_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
