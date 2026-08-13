import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { useItemsStore } from '../../items/store/useItemsStore';
import { useEnvironmentsStore } from '../../../shared/store/useEnvironmentsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { CategoryPill } from '../../../shared/components/CategoryPill';
import { Button } from '../../../shared/components/Button';
import { ShelfGrid } from '../components/ShelfGrid';
import { computeTotalPages } from '../../../shared/utils/gridLayout';
import { computeCoverVerticalCrop, mapImageYToContainerY, resolveShelfBackground } from '../../../shared/utils/shelfBackground';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { Item } from '../../../shared/types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ShelfView'>;

export function ShelfViewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;

  const group = useGroupsStore((s) => s.getGroupById(groupId));
  const refreshGroups = useGroupsStore((s) => s.refresh);
  const items = useItemsStore((s) => s.items);
  const refreshItems = useItemsStore((s) => s.refresh);
  const placeInSlot = useItemsStore((s) => s.placeInSlot);
  const environments = useEnvironmentsStore((s) => s.environments);
  const refreshEnvironments = useEnvironmentsStore((s) => s.refresh);

  const [assignTarget, setAssignTarget] = useState<{ row: number; col: number } | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const pageWidth = pageSize.width;
  const [currentPage, setCurrentPage] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refreshGroups();
      refreshItems();
      refreshEnvironments();
    }, [refreshGroups, refreshItems, refreshEnvironments])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: group?.name ?? 'Shelf' });
  }, [navigation, group?.name]);

  const env = useMemo(
    () => environments.find((e) => e.id === group?.activeEnvironmentId) ?? null,
    [environments, group?.activeEnvironmentId]
  );

  // Swaps in the FULL background asset (image + anchors) authored for this
  // group's exact row count — not just an overlay grid on a stretched
  // image — so resizing rows also resizes/re-anchors the art itself.
  const background = useMemo(() => resolveShelfBackground(env, group?.rows ?? 1), [env, group?.rows]);

  // shelfAnchorY is authored relative to the FULL source image; map it onto
  // the actually-rendered (possibly cover-cropped) page bounds once we know
  // both the image's natural size and the measured page size.
  const rowAnchorsY = useMemo(() => {
    if (!background.imageUri || !background.imageWidth || !background.imageHeight || pageSize.width === 0 || pageSize.height === 0) {
      return background.anchorsY;
    }
    const crop = computeCoverVerticalCrop(background.imageWidth, background.imageHeight, pageSize.width, pageSize.height);
    return background.anchorsY.map((y) => mapImageYToContainerY(y, crop));
  }, [background, pageSize.width, pageSize.height]);

  const groupItems = useMemo(
    () => items.filter((i) => i.groupId === groupId && i.status === 'owned' && i.slotRow !== null),
    [items, groupId]
  );

  const unplacedOwned = useMemo(
    () => items.filter((i) => i.groupId === groupId && i.status === 'owned' && i.slotRow === null),
    [items, groupId]
  );

  const totalPages = useMemo(
    () => computeTotalPages(group?.rows ?? 1, group?.columns ?? 1, groupItems.length),
    [group?.rows, group?.columns, groupItems.length]
  );
  const pages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i), [totalPages]);

  // Selling/removing the last item on the trailing page, or resizing the
  // grid via "Resize Layout", can both shrink the page count out from under
  // the user's current position — clamp so we never render a page index
  // that no longer exists.
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const clampedPage = Math.min(currentPage, totalPages - 1);

  if (!group) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.missingText}>This group no longer exists.</Text>
      </ScreenContainer>
    );
  }

  const handleEmptySlotPress = (row: number, col: number) => {
    if (unplacedOwned.length === 0) {
      navigation.navigate('AddEditItem', { groupId, presetSlot: { row, col } });
      return;
    }
    Alert.alert('Empty Slot', 'Add a new item, or place one you already own?', [
      { text: 'Add New Item', onPress: () => navigation.navigate('AddEditItem', { groupId, presetSlot: { row, col } }) },
      { text: 'Place Existing Item', onPress: () => setAssignTarget({ row, col }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleItemPress = (item: Item) => {
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  const handleDropItem = (itemId: string, row: number, col: number) => {
    placeInSlot(itemId, row, col);
  };

  const handleAssignExisting = (item: Item) => {
    if (assignTarget) {
      placeInSlot(item.id, assignTarget.row, assignTarget.col);
    }
    setAssignTarget(null);
  };

  const handleStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPageSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth === 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setCurrentPage(page);
  };

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <CategoryPill category={group.category} compact />
        <View style={styles.topBarActions}>
          <Pressable
            hitSlop={8}
            onPress={() => navigation.navigate('ResizeGroupLayout', { groupId })}
            style={styles.iconButton}
            accessibilityLabel="Resize layout"
          >
            <Text style={styles.iconButtonText}>⚙️</Text>
          </Pressable>
          <Button label="Skin Locker" variant="secondary" onPress={() => navigation.navigate('SkinLocker', { groupId })} />
        </View>
      </View>

      <View style={styles.stageOuter} onLayout={handleStageLayout}>
        {pageWidth > 0 ? (
          <FlatList
            data={pages}
            keyExtractor={(p) => String(p)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            renderItem={({ item: pageIndex }) => {
              const rowOffset = pageIndex * group.rows;
              const pageItems = groupItems.filter(
                (i) => i.slotRow !== null && i.slotRow >= rowOffset && i.slotRow < rowOffset + group.rows
              );
              return (
                <View
                  style={[styles.stage, { width: pageWidth, backgroundColor: env?.backgroundColor ?? colors.slotEmpty }]}
                >
                  {background.imageUri ? (
                    // "cover" so the art fills the fixed-size grid without empty
                    // letterboxing or visible distortion — "stretch" would warp
                    // the texture (especially noticeable on very wide/tall
                    // rows x columns shapes), and "contain" leaves bars. The
                    // resulting crop is accounted for in `rowAnchorsY` above.
                    <Image source={{ uri: background.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : null}
                  <View style={styles.gridWrap}>
                    <ShelfGrid
                      rows={group.rows}
                      cols={group.columns}
                      rowOffset={rowOffset}
                      rowAnchorsY={rowAnchorsY}
                      items={pageItems}
                      onEmptySlotPress={handleEmptySlotPress}
                      onItemPress={handleItemPress}
                      onDropItem={handleDropItem}
                    />
                  </View>
                </View>
              );
            }}
          />
        ) : null}
      </View>

      {totalPages > 1 ? (
        <View style={styles.pageIndicatorRow}>
          {pages.map((p) => (
            <View key={p} style={[styles.pageDot, p === clampedPage && styles.pageDotActive]} />
          ))}
          <Text style={styles.pageIndicatorText}>
            Page {clampedPage + 1} / {totalPages}
          </Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.footerHint}>
          {groupItems.length} placed · {unplacedOwned.length} owned & unplaced
        </Text>
        <Button label="Add Item" onPress={() => navigation.navigate('AddEditItem', { groupId })} />
      </View>

      <Modal visible={assignTarget !== null} transparent animationType="fade" onRequestClose={() => setAssignTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAssignTarget(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Place which item?</Text>
            <FlatList
              data={unplacedOwned}
              keyExtractor={(i) => i.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <Pressable style={styles.modalRow} onPress={() => handleAssignExisting(item)}>
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.modalThumb} />
                  ) : (
                    <View style={[styles.modalThumb, styles.modalThumbPlaceholder]} />
                  )}
                  <Text style={styles.modalRowText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setAssignTarget(null)} fullWidth />
          </View>
        </Pressable>
      </Modal>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 16,
  },
  stageOuter: {
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  stage: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  // No padding/centering here on purpose — `rowAnchorsY` is computed
  // against this exact box's measured bounds (see `handleStageLayout`),
  // which must match the background `Image`'s absoluteFill bounds above
  // for shelf-line anchors to land in the right place.
  gridWrap: {
    flex: 1,
  },
  pageIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  pageDotActive: {
    backgroundColor: colors.textPrimary,
  },
  pageIndicatorText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerHint: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  modalList: {
    flexGrow: 0,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  modalThumbPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalRowText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
});
