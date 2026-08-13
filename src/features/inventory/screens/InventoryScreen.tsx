import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useItemsStore } from '../../items/store/useItemsStore';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { TextField } from '../../../shared/components/TextField';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ItemListRow } from '../components/ItemListRow';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { ITEM_STATUSES, ITEM_STATUS_LABELS, ItemStatus } from '../../../shared/types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortBy = 'date' | 'amount';

export function InventoryScreen() {
  const navigation = useNavigation<Nav>();
  const items = useItemsStore((s) => s.items);
  const refreshItems = useItemsStore((s) => s.refresh);
  const removeItem = useItemsStore((s) => s.removeItem);
  const setStatus = useItemsStore((s) => s.setStatus);
  const groups = useGroupsStore((s) => s.groups);
  const refreshGroups = useGroupsStore((s) => s.refresh);

  const [statusTab, setStatusTab] = useState<ItemStatus>('owned');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');

  useFocusEffect(
    useCallback(() => {
      refreshItems();
      refreshGroups();
    }, [refreshItems, refreshGroups])
  );

  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = items.filter((i) => i.status === statusTab);
    if (groupFilter !== 'all') list = list.filter((i) => i.groupId === groupFilter);
    if (query) {
      list = list.filter((i) => {
        // barcodeCode is included so "have I already logged this exact
        // barcode before?" works entirely offline against local history —
        // there's no product-lookup API to ask instead.
        const haystack = `${i.name} ${i.seriesFranchise ?? ''} ${i.tags.join(' ')} ${i.barcodeCode ?? ''}`.toLowerCase();
        return haystack.includes(query);
      });
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'amount') return (b.purchaseAmount ?? 0) - (a.purchaseAmount ?? 0);
      return (b.purchaseDate ?? b.createdAt) - (a.purchaseDate ?? a.createdAt);
    });
    return list;
  }, [items, statusTab, groupFilter, search, sortBy]);

  const handleLongPress = (itemId: string, itemName: string) => {
    Alert.alert(itemName, undefined, [
      { text: 'Edit', onPress: () => {
          const item = items.find((i) => i.id === itemId);
          if (item) navigation.navigate('AddEditItem', { groupId: item.groupId, itemId });
        } },
      {
        text: 'Change Status',
        onPress: () => {
          Alert.alert(
            'Change Status',
            undefined,
            ITEM_STATUSES.map((s) => ({ text: ITEM_STATUS_LABELS[s], onPress: () => setStatus(itemId, s) }))
          );
        },
      },
      { text: 'Delete', style: 'destructive', onPress: () => removeItem(itemId) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
      </View>

      <View>
        <SegmentedControl
          segments={ITEM_STATUSES.map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] }))}
          value={statusTab}
          onChange={setStatusTab}
          scrollable
        />
      </View>

      <View style={styles.filtersRow}>
        <SegmentedControl
          segments={[{ value: 'all' as const, label: 'All Groups' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
          value={groupFilter}
          onChange={setGroupFilter}
          scrollable
        />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <TextField placeholder="Search by name, series, tag, or barcode" value={search} onChangeText={setSearch} />
        </View>
        <SegmentedControl
          segments={[
            { value: 'date' as const, label: 'Date' },
            { value: 'amount' as const, label: 'Amount' },
          ]}
          value={sortBy}
          onChange={setSortBy}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title={`No ${ITEM_STATUS_LABELS[statusTab].toLowerCase()} items`}
          subtitle="Try a different filter, or add a new item from a group's Shelf View."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemListRow
              item={item}
              groupName={groupNameById.get(item.groupId) ?? 'Unknown group'}
              onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
              onLongPress={() => handleLongPress(item.id, item.name)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
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
  filtersRow: {
    marginTop: spacing.sm,
  },
  searchRow: {
    marginTop: 30,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
});
