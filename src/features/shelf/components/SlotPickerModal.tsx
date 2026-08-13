import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../shared/components/Button';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { Item } from '../../../shared/types/models';
import { computeTotalPages } from '../../../shared/utils/gridLayout';

interface SlotPickerModalProps {
  visible: boolean;
  rows: number;
  columns: number;
  occupiedItems: Item[];
  onSelect: (row: number, col: number) => void;
  onSkip: () => void;
}

/**
 * Lightweight tap-to-pick grid used right after marking an item 'owned' so
 * the user can place it immediately, without leaving the Add/Edit form.
 *
 * The group's grid is fixed-size (`rows x columns`, see "Resize Layout"),
 * so this never grows a row on the fly — it simply lists every slot across
 * however many pages are already needed to hold `occupiedItems`, stacked
 * vertically in one scrollable grid. If every one of those slots is already
 * occupied, there's nothing free to tap; the user places it later, either
 * after freeing a slot or resizing the layout for more room.
 */
export function SlotPickerModal({ visible, rows, columns, occupiedItems, onSelect, onSkip }: SlotPickerModalProps) {
  const occupied = new Set(occupiedItems.map((i) => `${i.slotRow}:${i.slotCol}`));
  const totalPages = computeTotalPages(rows, columns, occupiedItems.length);
  const totalRows = rows * totalPages;

  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < columns; c++) cells.push({ row: r, col: c });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Place this item on the shelf?</Text>
          <Text style={styles.subtitle}>Tap an empty slot, or place it later from the Shelf View.</Text>
          <ScrollView style={styles.gridScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.grid}>
              {cells.map(({ row, col }) => {
                const key = `${row}:${col}`;
                const isOccupied = occupied.has(key);
                return (
                  <Pressable
                    key={key}
                    disabled={isOccupied}
                    onPress={() => onSelect(row, col)}
                    style={[styles.cellWrap, { width: `${100 / columns}%` }]}
                  >
                    <View style={[styles.cell, isOccupied && styles.cellOccupied]} />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Button label="Place Later" variant="ghost" onPress={onSkip} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  gridScroll: {
    flexGrow: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellWrap: {
    aspectRatio: 1,
    padding: 3,
  },
  cell: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.slotBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.slotEmpty,
  },
  cellOccupied: {
    backgroundColor: colors.borderStrong,
    borderStyle: 'solid',
    opacity: 0.6,
  },
});
