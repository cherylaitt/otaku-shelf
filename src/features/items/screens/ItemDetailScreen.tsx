import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useItemsStore } from '../store/useItemsStore';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Button } from '../../../shared/components/Button';
import { StatusPill } from '../../../shared/components/StatusPill';
import { CategoryPill } from '../../../shared/components/CategoryPill';
import { SlotPickerModal } from '../../shelf/components/SlotPickerModal';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { ITEM_TYPE_LABELS } from '../../../shared/types/models';
import { formatCurrency, formatDate } from '../../../shared/utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ItemDetail'>;

export function ItemDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { itemId } = route.params;

  const items = useItemsStore((s) => s.items);
  const setStatus = useItemsStore((s) => s.setStatus);
  const removeItem = useItemsStore((s) => s.removeItem);
  const placeInSlot = useItemsStore((s) => s.placeInSlot);

  const item = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);
  const group = useGroupsStore((s) => (item ? s.getGroupById(item.groupId) : undefined));

  const [showSlotPicker, setShowSlotPicker] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: item?.name ?? 'Item' });
  }, [navigation, item?.name]);

  if (!item || !group) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.missingText}>This item no longer exists.</Text>
      </ScreenContainer>
    );
  }

  const placedGroupItems = items.filter(
    (i) => i.groupId === group.id && i.status === 'owned' && i.slotRow !== null && i.id !== item.id
  );

  const handleDelete = () => {
    Alert.alert('Delete Item', `Permanently delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeItem(item.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleMarkSold = () => {
    Alert.alert('Mark as Sold', `Move "${item.name}" to the Sold Archive?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Sold', onPress: () => setStatus(item.id, 'sold') },
    ]);
  };

  const handleRestoreToOwned = () => {
    setStatus(item.id, 'owned');
    setShowSlotPicker(true);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>No Photo</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.name}>{item.name}</Text>
            {item.seriesFranchise ? <Text style={styles.series}>{item.seriesFranchise}</Text> : null}
          </View>
          <StatusPill status={item.status} />
        </View>

        <View style={styles.pillRow}>
          <CategoryPill category={group.category} compact />
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{ITEM_TYPE_LABELS[item.itemType]}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoRow label="Group" value={group.name} />
          <InfoRow label="Purchase Amount" value={formatCurrency(item.purchaseAmount)} />
          <InfoRow label="Purchase Date" value={formatDate(item.purchaseDate)} />
          <InfoRow
            label="Placed"
            value={item.slotRow !== null ? `Row ${item.slotRow + 1}, Col ${item.slotCol! + 1}` : 'Not placed'}
          />
          {item.barcodeCode ? <InfoRow label="Barcode" value={item.barcodeCode} /> : null}
        </View>

        {item.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button label="Edit Item" onPress={() => navigation.navigate('AddEditItem', { groupId: group.id, itemId: item.id })} fullWidth />
          {item.status === 'sold' ? (
            <Button label="Restore to Owned" variant="secondary" onPress={handleRestoreToOwned} fullWidth />
          ) : (
            <Button label="Mark as Sold" variant="secondary" onPress={handleMarkSold} fullWidth />
          )}
          <Button label="Delete Item" variant="danger" onPress={handleDelete} fullWidth />
        </View>
      </ScrollView>

      <SlotPickerModal
        visible={showSlotPicker}
        rows={group.rows}
        columns={group.columns}
        occupiedItems={placedGroupItems}
        onSelect={(row, col) => {
          placeInSlot(item.id, row, col);
          setShowSlotPicker(false);
        }}
        onSkip={() => setShowSlotPicker(false)}
      />
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    ...typography.body,
    color: colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
  },
  series: {
    ...typography.body,
    color: colors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  infoGrid: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notesBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  notesText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
