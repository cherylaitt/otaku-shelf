import React, { useCallback } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useGroupsStore } from '../store/useGroupsStore';
import { useItemsStore } from '../../items/store/useItemsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { CategoryPill } from '../../../shared/components/CategoryPill';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/Button';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { Group } from '../../../shared/types/models';
import { resolveShelfBackground } from '../../../shared/utils/shelfBackground';
import { BACKGROUND_COLOR_BY_CATEGORY } from '../../../shared/config/shelfBackgrounds';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function GroupListScreen() {
  const navigation = useNavigation<Nav>();
  const groups = useGroupsStore((s) => s.groups);
  const refreshGroups = useGroupsStore((s) => s.refresh);
  const deleteGroup = useGroupsStore((s) => s.deleteGroup);
  const items = useItemsStore((s) => s.items);
  const refreshItems = useItemsStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      refreshGroups();
      refreshItems();
    }, [refreshGroups, refreshItems])
  );

  const handleDelete = (group: Group) => {
    const ownedCount = items.filter((i) => i.groupId === group.id).length;
    Alert.alert(
      `Delete "${group.name}"?`,
      ownedCount > 0
        ? `This will permanently delete all ${ownedCount} item${ownedCount === 1 ? '' : 's'} in this group. This cannot be undone.`
        : 'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(group.id) },
      ]
    );
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.hero}>Otaku Shelf</Text>
        <Text style={styles.heroSubtitle}>Your collections, on display.</Text>
      </View>

      {groups.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No collections yet"
          subtitle="Create a group for your paper goods or figures to start building your display."
          actionLabel="Create your first group"
          onAction={() => navigation.navigate('CreateGroup')}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: group }) => {
            const ownedCount = items.filter((i) => i.groupId === group.id && i.status === 'owned').length;
            // Match this specific group's row count so a resize is
            // reflected here too, not just on the Shelf View itself.
            const preview = resolveShelfBackground(group.category, group.rows);
            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate('ShelfView', { groupId: group.id })}
                onLongPress={() => handleDelete(group)}
              >
                <View style={[styles.thumb, { backgroundColor: BACKGROUND_COLOR_BY_CATEGORY[group.category] ?? colors.slotEmpty }]}>
                  {preview.imageUri ? (
                    <Image source={{ uri: preview.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : null}
                  <View style={styles.thumbGridOverlay}>
                    {Array.from({ length: Math.min(group.columns * group.rows, 9) }).map((_, i) => (
                      <View key={i} style={styles.thumbCell} />
                    ))}
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <CategoryPill category={group.category} compact />
                  </View>
                  {group.description ? (
                    <Text style={styles.cardDescription} numberOfLines={1}>
                      {group.description}
                    </Text>
                  ) : null}
                  <Text style={styles.cardMeta}>
                    {group.columns} × {group.rows} · {ownedCount} item
                    {ownedCount === 1 ? '' : 's'} on display
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <Button
              label="+ New Group"
              variant="secondary"
              onPress={() => navigation.navigate('CreateGroup')}
              style={styles.newGroupButton}
            />
          }
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
    marginBottom: spacing.lg,
  },
  hero: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: 4,
  },
  thumbGridOverlay: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  thumbCell: {
    width: '30%',
    height: '30%',
    borderRadius: 2,
    backgroundColor: '#00000022',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  newGroupButton: {
    marginTop: spacing.sm,
  },
});
