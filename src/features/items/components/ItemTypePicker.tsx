import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Category, ITEM_TYPES_BY_CATEGORY, ITEM_TYPE_LABELS, ItemType } from '../../../shared/types/models';
import { categoryColor, categorySoftColor, colors, radius, spacing, typography } from '../../../shared/theme/theme';

interface ItemTypePickerProps {
  category: Category;
  value: ItemType | null;
  onChange: (type: ItemType) => void;
}

/**
 * Options are always filtered to the parent Group's locked category — the
 * caller never has the option to pass an out-of-category type here.
 */
export function ItemTypePicker({ category, value, onChange }: ItemTypePickerProps) {
  const options = ITEM_TYPES_BY_CATEGORY[category];
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Item Type</Text>
      <View style={styles.row}>
        {options.map((type) => {
          const selected = value === type;
          return (
            <Pressable
              key={type}
              onPress={() => onChange(type)}
              style={[
                styles.chip,
                selected && { backgroundColor: categorySoftColor(category), borderColor: categoryColor(category) },
              ]}
            >
              <Text style={[styles.chipText, selected && { color: categoryColor(category) }]}>
                {ITEM_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
