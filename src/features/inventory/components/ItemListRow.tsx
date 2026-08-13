import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Item, ITEM_TYPE_LABELS } from '../../../shared/types/models';
import { StatusPill } from '../../../shared/components/StatusPill';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { formatCurrency, formatDate } from '../../../shared/utils/format';

interface ItemListRowProps {
  item: Item;
  groupName: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export function ItemListRow({ item, groupName, onPress, onLongPress }: ItemListRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <StatusPill status={item.status} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {groupName} · {ITEM_TYPE_LABELS[item.itemType]}
          {item.seriesFranchise ? ` · ${item.seriesFranchise}` : ''}
        </Text>
        <Text style={styles.meta}>
          {formatCurrency(item.purchaseAmount)} · {formatDate(item.purchaseDate)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
