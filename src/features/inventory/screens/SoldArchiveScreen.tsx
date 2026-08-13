import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useItemsStore } from '../../items/store/useItemsStore';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ItemListRow } from '../components/ItemListRow';
import { SlotPickerModal } from '../../shelf/components/SlotPickerModal';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { Category } from '../../../shared/types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CategoryFilter = 'all' | Category;

export function SoldArchiveScreen() {
  const navigation = useNavigation<Nav>();
  const items = useItemsStore((s) => s.items);
  const refreshItems = useItemsStore((s) => s.refresh);
  const placeInSlot = useItemsStore((s) => s.placeInSlot);
  const setStatus = useItemsStore((s) => s.setStatus);
  const groups = useGroupsStore((s) => s.groups);
  const refreshGroups = useGroupsStore((s) => s.refresh);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');
  const [restoreItemId, setRestoreItemId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshItems();
      refreshGroups();
    }, [refreshItems, refreshGroups])
  );

  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const visibleGroups = useMemo(
    () => (categoryFilter === 'all' ? groups : groups.filter((g) => g.category === categoryFilter)),
    [groups, categoryFilter]
  );

  const soldItems = useMemo(() => {
    let list = items.filter((i) => i.status === 'sold');
    if (categoryFilter !== 'all') {
      list = list.filter((i) => groupById.get(i.groupId)?.category === categoryFilter);
    }
    if (groupFilter !== 'all') {
      list = list.filter((i) => i.groupId === groupFilter);
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, categoryFilter, groupFilter, groupById]);

  const restoreItem = restoreItemId ? items.find((i) => i.id === restoreItemId) ?? null : null;
  const restoreGroup = restoreItem ? groupById.get(restoreItem.groupId) : undefined;
  const placedGroupItems = restoreGroup
    ? items.filter((i) => i.groupId === restoreGroup.id && i.status === 'owned' && i.slotRow !== null)
    : [];

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Archive</Text>
        <Text style={styles.subtitle}>A read-only record of everything you&apos;ve archived.</Text>
      </View>

      <View>
        <SegmentedControl
          segments={[
            { value: 'all' as const, label: 'All' },
            { value: 'paper' as const, label: 'Paper' },
            { value: 'figure' as const, label: 'Figure' },
          ]}
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v);
            setGroupFilter('all');
          }}
          scrollable
        />
      </View>

      {visibleGroups.length > 0 ? (
        <View style={styles.groupFilterRow}>
          <SegmentedControl
            segments={[{ value: 'all' as const, label: 'All Groups' }, ...visibleGroups.map((g) => ({ value: g.id, label: g.name }))]}
            value={groupFilter}
            onChange={setGroupFilter}
            scrollable
          />
        </View>
      ) : null}

      {soldItems.length === 0 ? (
        <EmptyState icon="🗃️" title="Nothing archived yet" subtitle="Items you mark as archived will show up here." />
      ) : (
        <FlatList
          data={soldItems}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemListRow
              item={item}
              groupName={groupNameById.get(item.groupId) ?? 'Unknown group'}
              onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
              onLongPress={() =>
                Alert.alert('Restore Item', `Move "${item.name}" back to Owned and place it on a shelf?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Restore',
                    onPress: () => {
                      setStatus(item.id, 'owned');
                      setRestoreItemId(item.id);
                    },
                  },
                ])
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      {restoreGroup && restoreItem ? (
        <SlotPickerModal
          visible={restoreItemId !== null}
          rows={restoreGroup.rows}
          columns={restoreGroup.columns}
          occupiedItems={placedGroupItems}
          onSelect={(row, col) => {
            placeInSlot(restoreItem.id, row, col);
            setRestoreItemId(null);
          }}
          onSkip={() => setRestoreItemId(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  groupFilterRow: {
    marginTop: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
});
