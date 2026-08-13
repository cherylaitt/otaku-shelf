import React, { useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useGroupsStore } from '../store/useGroupsStore';
import { useItemsStore } from '../../items/store/useItemsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Button } from '../../../shared/components/Button';
import { GridPresetPicker } from '../../../shared/components/GridPresetPicker';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { GRID_COLUMN_PRESETS, GRID_ROW_PRESETS } from '../../../shared/types/models';
import { computeTotalPages } from '../../../shared/utils/gridLayout';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ResizeGroupLayout'>;

/**
 * "Resize Layout" — the one place a group's fixed `rows`/`columns` can
 * change after creation, reached via an explicit edit action on the group
 * (not a gesture). Uses the same preset-picker pattern as group creation.
 *
 * Saving reflows every placed item into the new dimensions in one step
 * (see `useGroupsStore.resizeGroup` / `itemsRepository.reflowForGroup`):
 * shrinking overflows extra cards onto additional pages in their existing
 * order, growing re-flows cards to fill the larger grid and merges pages
 * back together wherever the new capacity allows.
 */
export function ResizeGroupLayoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;

  const group = useGroupsStore((s) => s.getGroupById(groupId));
  const resizeGroup = useGroupsStore((s) => s.resizeGroup);
  const items = useItemsStore((s) => s.items);

  const [rows, setRows] = useState(group?.rows ?? 5);
  const [columns, setColumns] = useState(group?.columns ?? 4);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Resize Layout' });
  }, [navigation]);

  const placedCount = useMemo(
    () => items.filter((i) => i.groupId === groupId && i.status === 'owned' && i.slotRow !== null).length,
    [items, groupId]
  );

  const currentPages = group ? computeTotalPages(group.rows, group.columns, placedCount) : 1;
  const newPages = computeTotalPages(rows, columns, placedCount);
  const dimensionsChanged = group ? rows !== group.rows || columns !== group.columns : false;

  if (!group) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.missingText}>This group no longer exists.</Text>
      </ScreenContainer>
    );
  }

  const handleSave = () => {
    resizeGroup(groupId, rows, columns);
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Resize {group.name}</Text>
        <Text style={styles.subtitle}>
          Changes here only affect this group. {placedCount} card{placedCount === 1 ? '' : 's'} currently on display
          across {currentPages} page{currentPages === 1 ? '' : 's'}.
        </Text>

        <GridPresetPicker label="Rows" presets={GRID_ROW_PRESETS} value={rows} onChange={setRows} />
        <GridPresetPicker label="Columns" presets={GRID_COLUMN_PRESETS} value={columns} onChange={setColumns} />

        {dimensionsChanged ? (
          <Text style={styles.previewText}>
            {newPages > currentPages
              ? `This will spread your ${placedCount} card${placedCount === 1 ? '' : 's'} across ${newPages} pages — cards that no longer fit on a page will overflow onto the next one, in their current order.`
              : newPages < currentPages
                ? `This will re-flow your ${placedCount} card${placedCount === 1 ? '' : 's'} to fit in ${newPages} page${newPages === 1 ? '' : 's'}.`
                : `Your ${placedCount} card${placedCount === 1 ? '' : 's'} will be re-flowed to fit the new shape.`}
          </Text>
        ) : null}

        <Button label="Save Layout" onPress={handleSave} disabled={!dimensionsChanged} fullWidth style={styles.saveBtn} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
      </ScrollView>
    </ScreenContainer>
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  previewText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
