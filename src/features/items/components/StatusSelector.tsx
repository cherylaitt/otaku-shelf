import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { ITEM_STATUSES, ITEM_STATUS_LABELS, ItemStatus } from '../../../shared/types/models';
import { colors, spacing, typography } from '../../../shared/theme/theme';

export function StatusSelector({ value, onChange }: { value: ItemStatus; onChange: (v: ItemStatus) => void }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Status</Text>
      <SegmentedControl
        segments={ITEM_STATUSES.map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] }))}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
