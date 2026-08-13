import React, { useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Item } from '../../../shared/types/models';
import { evenRowAnchors } from '../../../shared/utils/shelfBackground';
import { colors, radius } from '../../../shared/theme/theme';

const GAP = 8;

interface ShelfGridProps {
  /** Number of rows visible on THIS page — always the group's full fixed row count, since every page (including the last) renders the same complete grid. */
  rows: number;
  cols: number;
  /**
   * Global row index of this page's local row 0. `items[].slotRow` is a
   * global index across the whole (unpaged) shelf; this offset lets a
   * single page render its slice of that global grid while still reporting
   * global row numbers back through the callbacks. Cross-page drag/drop is
   * out of scope for now — dragging is clamped to this page's local rows.
   */
  rowOffset?: number;
  /**
   * Normalized (0-1) bottom-edge Y for each local row, relative to this
   * grid's full rendered height — already mapped from the background
   * image's `shelfAnchorY` to account for any "cover" cropping (see
   * `resolveShelfBackground`/`mapImageYToContainerY`). Rows are positioned
   * against these instead of dividing the height evenly, so items can sit
   * on shelf lines drawn into the art. Defaults to evenly-spaced rows when
   * there's no background art to anchor against.
   */
  rowAnchorsY?: number[];
  items: Item[]; // only owned items whose (global) slotRow falls within this page
  onEmptySlotPress: (row: number, col: number) => void;
  onItemPress: (item: Item) => void;
  onDropItem: (itemId: string, row: number, col: number) => void;
}

export function ShelfGrid({
  rows,
  cols,
  rowOffset = 0,
  rowAnchorsY,
  items,
  onEmptySlotPress,
  onItemPress,
  onDropItem,
}: ShelfGridProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  if (size.width === 0 || size.height === 0) {
    return <View style={styles.measureContainer} onLayout={handleLayout} />;
  }

  const { width: containerWidth, height: containerHeight } = size;
  const slotSize = (containerWidth - GAP * (cols - 1)) / cols;
  const anchorsY = rowAnchorsY && rowAnchorsY.length === rows ? rowAnchorsY : evenRowAnchors(rows);
  const rowTop = (row: number) => anchorsY[row] * containerHeight - slotSize;

  const occupied = new Map<string, Item>();
  for (const item of items) {
    if (item.slotRow !== null && item.slotCol !== null) {
      occupied.set(`${item.slotRow - rowOffset}:${item.slotCol}`, item);
    }
  }

  const slots: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ row: r, col: c });
    }
  }

  return (
    <View style={[styles.grid, { width: containerWidth, height: containerHeight }]} onLayout={handleLayout}>
      {slots.map(({ row, col }) => {
        const key = `${row}:${col}`;
        if (occupied.has(key)) return null;
        return (
          <Pressable
            key={key}
            onPress={() => onEmptySlotPress(row + rowOffset, col)}
            style={[
              styles.emptySlot,
              {
                width: slotSize,
                height: slotSize,
                left: col * (slotSize + GAP),
                top: rowTop(row),
              },
            ]}
          >
            <Text style={styles.emptySlotPlus}>+</Text>
          </Pressable>
        );
      })}

      {items
        .filter((i) => i.slotRow !== null && i.slotCol !== null)
        .map((item) => (
          <DraggableItemThumb
            key={item.id}
            item={item}
            rowOffset={rowOffset}
            slotSize={slotSize}
            gap={GAP}
            cols={cols}
            anchorsY={anchorsY}
            containerHeight={containerHeight}
            onDrop={onDropItem}
            onPress={onItemPress}
          />
        ))}
    </View>
  );
}

interface DraggableItemThumbProps {
  item: Item;
  rowOffset: number;
  slotSize: number;
  gap: number;
  cols: number;
  anchorsY: number[];
  containerHeight: number;
  onDrop: (itemId: string, row: number, col: number) => void;
  onPress: (item: Item) => void;
}

/** Finds the row whose anchor line sits closest to a dropped item's bottom edge (`bottomY`), since anchors aren't evenly spaced and can't be inverted with simple division. */
function nearestAnchorRow(bottomY: number, anchorsY: number[], containerHeight: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let r = 0; r < anchorsY.length; r++) {
    const dist = Math.abs(anchorsY[r] * containerHeight - bottomY);
    if (dist < bestDist) {
      bestDist = dist;
      best = r;
    }
  }
  return best;
}

function DraggableItemThumb({
  item,
  rowOffset,
  slotSize,
  gap,
  cols,
  anchorsY,
  containerHeight,
  onDrop,
  onPress,
}: DraggableItemThumbProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const localRow = (item.slotRow ?? 0) - rowOffset;
  const baseX = (item.slotCol ?? 0) * (slotSize + gap);
  const baseY = anchorsY[localRow] * containerHeight - slotSize;

  const drop = (row: number, col: number) => onDrop(item.id, row + rowOffset, col);
  const press = () => onPress(item);

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      offsetX.value = e.translationX;
      offsetY.value = e.translationY;
    })
    .onEnd((e) => {
      const finalX = baseX + e.translationX;
      const finalBottomY = baseY + e.translationY + slotSize;
      // Clamped to this page's local rows/cols — cross-page dragging is a
      // possible future enhancement, out of scope for this fix.
      const targetCol = Math.min(Math.max(Math.round(finalX / (slotSize + gap)), 0), cols - 1);
      const targetRow = nearestAnchorRow(finalBottomY, anchorsY, containerHeight);
      offsetX.value = withSpring(0);
      offsetY.value = withSpring(0);
      runOnJS(drop)(targetRow, targetCol);
    })
    .onFinalize(() => {
      dragging.value = 0;
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) runOnJS(press)();
  });

  const composed = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    left: baseX,
    top: baseY,
    width: slotSize,
    height: slotSize,
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }, { scale: dragging.value ? 1.06 : 1 }],
    zIndex: dragging.value ? 10 : 1,
    opacity: dragging.value ? 0.9 : 1,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.itemSlot, animatedStyle]}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemPlaceholder}>
            <Text style={styles.itemPlaceholderText} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  measureContainer: {
    flex: 1,
    width: '100%',
  },
  grid: {
    position: 'relative',
  },
  emptySlot: {
    position: 'absolute',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.slotBorder,
    borderStyle: 'dashed',
    backgroundColor: '#00000022',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotPlus: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
  itemSlot: {
    position: 'absolute',
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: colors.bgCard,
  },
  itemPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
