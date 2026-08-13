import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { useEnvironmentsStore } from '../../../shared/store/useEnvironmentsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { RarityTag } from '../../../shared/components/RarityTag';
import { EmptyState } from '../../../shared/components/EmptyState';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { DISPLAY_KIND_LABELS, Environment } from '../../../shared/types/models';
import { resolveShelfBackground } from '../../../shared/utils/shelfBackground';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SkinLocker'>;

export function SkinLockerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;

  const group = useGroupsStore((s) => s.getGroupById(groupId));
  const setActiveEnvironment = useGroupsStore((s) => s.setActiveEnvironment);
  const environments = useEnvironmentsStore((s) => s.environments);
  const refreshEnvironments = useEnvironmentsStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      refreshEnvironments();
    }, [refreshEnvironments])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Skin Locker' });
  }, [navigation]);

  const pool = useMemo(
    () => (group ? environments.filter((e) => e.category === group.category) : []),
    [environments, group]
  );

  if (!group) return null;

  const handleSelect = (env: Environment) => {
    if (!env.isUnlocked) return;
    setActiveEnvironment(groupId, env.id);
    Alert.alert('Equipped', `"${env.name}" is now the active display for "${group.name}".`);
    navigation.goBack();
  };

  return (
    <ScreenContainer style={styles.screen}>
      <Text style={styles.subtitle}>
        Showing {group.category} environments only — unlock more from the Gacha screen.
      </Text>
      {pool.length === 0 ? (
        <EmptyState title="No environments found" subtitle="Something went wrong seeding the catalog." />
      ) : (
        <FlatList
          data={pool}
          keyExtractor={(e) => e.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item: env }) => {
            const isActive = group.activeEnvironmentId === env.id;
            // Preview the asset this environment would actually show once
            // equipped on THIS group — i.e. the variant matching its
            // current row count, not just any bundled image.
            const preview = resolveShelfBackground(env, group.rows);
            return (
              <Pressable
                onPress={() => handleSelect(env)}
                disabled={!env.isUnlocked}
                style={[
                  styles.card,
                  { backgroundColor: env.backgroundColor },
                  !env.isUnlocked && styles.cardLocked,
                  isActive && styles.cardActive,
                ]}
              >
                {preview.imageUri ? (
                  <Image source={{ uri: preview.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : null}
                {!env.isUnlocked ? (
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                ) : null}
                {isActive ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>EQUIPPED</Text>
                  </View>
                ) : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {env.name}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardKind}>{DISPLAY_KIND_LABELS[env.displayKind]}</Text>
                    <RarityTag rarity={env.rarity} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.md,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardActive: {
    borderColor: colors.textPrimary,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 28,
  },
  activeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    color: colors.bg,
  },
  cardFooter: {
    backgroundColor: '#00000066',
    padding: spacing.sm,
    gap: 4,
  },
  cardName: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardKind: {
    ...typography.caption,
    fontSize: 10,
    color: '#FFFFFFCC',
  },
});
