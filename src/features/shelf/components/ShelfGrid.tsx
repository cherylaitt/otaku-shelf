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
  const anchorsY = rowAnchorsY && rowAnchorsY.length === rows ? rowAnchorsY : evenRowAnchors(rows);

  // A slot's size can't just be "how wide is a column" (`colWidth` below) —
  // shelf compartments between two `shelfAnchorY` lines are frequently
  // *shorter* than a column is wide (few columns + many rows is the worst
  // case: wide columns, short compartments), and a slot that's wider than
  // its compartment is tall would poke up through the shelf line above it
  // instead of resting cleanly on the one below. So the real slot size is
  // capped by whichever row has the least headroom, computed from the gap
  // between consecutive anchors (or the container top, for row 0) — not
  // just from `containerWidth`/`cols`. `SLOT_FILL` leaves a little
  // clearance above each item (real objects don't touch the shelf above
  // them either), and also keeps a same-size slot from landing exactly
  // flush with both the anchor below AND the one above at once.
  const colWidth = (containerWidth - GAP * (cols - 1)) / cols;
  let minRowHeight = Infinity;
  for (let r = 0; r < rows; r++) {
    const top = r === 0 ? 0 : anchorsY[r - 1] * containerHeight;
    const bottom = anchorsY[r] * containerHeight;
    minRowHeight = Math.min(minRowHeight, bottom - top);
  }
  const SLOT_FILL = 0.9;
  const slotSize = Math.max(1, Math.min(colWidth, minRowHeight * SLOT_FILL));

  // Columns are still evenly divided (per spec, only row anchoring is
  // non-uniform) — but if `slotSize` came out smaller than `colWidth`
  // (height-constrained), the grid's total footprint is now narrower than
  // the container, so re-center it horizontally rather than leaving it
  // jammed against the left edge with dead space on the right.
  const gridWidth = cols * slotSize + (cols - 1) * GAP;
  const offsetX = Math.max(0, (containerWidth - gridWidth) / 2);
  const colLeft = (col: number) => offsetX + col * (slotSize + GAP);
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
                left: colLeft(col),
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
            gridOffsetX={offsetX}
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
  /** Horizontal re-centering offset applied when `slotSize` came out narrower than a full column (see `offsetX` in `ShelfGrid`) — 0 in the common, unconstrained case. */
  gridOffsetX: number;
  anchorsY: number[];
  containerHeight: number;
  onDrop: (itemId: string, row: number, col: number) => void;
  onPress: (item: Item) => void;
}

/**
 * Finds the row whose anchor line sits closest to a dropped item's bottom
 * edge (`bottomY`), since anchors aren't evenly spaced and can't be
 * inverted with simple division. Called synchronously from inside the pan
 * gesture's `.onEnd()` worklet (UI thread) — needs its own `'worklet'`
 * directive, since react-native-worklets only auto-compiles the gesture
 * callback itself, not plain helper functions it calls; without this it
 * throws "Tried to synchronously call a Remote Function" instead of
 * running on the UI thread.
 */
function nearestAnchorRow(bottomY: number, anchorsY: number[], containerHeight: number): number {
  'worklet';
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
  gridOffsetX,
  anchorsY,
  containerHeight,
  onDrop,
  onPress,
}: DraggableItemThumbProps) {
  const dragOffsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const localRow = (item.slotRow ?? 0) - rowOffset;
  const baseX = gridOffsetX + (item.slotCol ?? 0) * (slotSize + gap);
  const baseY = anchorsY[localRow] * containerHeight - slotSize;

  const drop = (row: number, col: number) => onDrop(item.id, row + rowOffset, col);
  const press = () => onPress(item);

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      dragOffsetX.value = e.translationX;
      offsetY.value = e.translationY;
    })
    .onEnd((e) => {
      const finalX = baseX + e.translationX;
      const finalBottomY = baseY + e.translationY + slotSize;
      // Clamped to this page's local rows/cols — cross-page dragging is a
      // possible future enhancement, out of scope for this fix.
      const targetCol = Math.min(Math.max(Math.round((finalX - gridOffsetX) / (slotSize + gap)), 0), cols - 1);
      const targetRow = nearestAnchorRow(finalBottomY, anchorsY, containerHeight);
      dragOffsetX.value = withSpring(0);
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
    transform: [{ translateX: dragOffsetX.value }, { translateY: offsetY.value }, { scale: dragging.value ? 1.06 : 1 }],
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
  // No backgroundColor here on purpose: a background-removed item photo is
  // a transparent-background PNG cutout (see backgroundRemoval.ts), and
  // this slot sits directly on top of the shelf's own background image —
  // an opaque fill here would hide it behind a flat color swatch instead
  // of letting the item look like it's actually resting on the shelf.
  // `itemPlaceholder` below (the no-photo case) supplies its own opaque
  // background, and a normal (non-cutout) photo with `resizeMode="cover"`
  // already fills these bounds completely, so this is a no-op for it.
  itemSlot: {
    position: 'absolute',
    borderRadius: radius.sm,
    overflow: 'hidden',
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
