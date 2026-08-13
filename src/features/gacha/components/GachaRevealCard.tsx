import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { CategoryPill } from '../../../shared/components/CategoryPill';
import { RarityTag } from '../../../shared/components/RarityTag';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { DISPLAY_KIND_LABELS, Environment } from '../../../shared/types/models';
import { pickRepresentativeVariant } from '../../../shared/utils/shelfBackground';

interface GachaRevealCardProps {
  environment: Environment;
  wasNewUnlock: boolean;
  revealKey: string;
}

export function GachaRevealCard({ environment, wasNewUnlock, revealKey }: GachaRevealCardProps) {
  // No specific group/row-count is in play during a reveal — just show a
  // representative variant of the art.
  const variant = pickRepresentativeVariant(environment);
  return (
    <Animated.View key={revealKey} entering={ZoomIn.duration(420)} style={styles.wrapper}>
      <View style={[styles.swatch, { backgroundColor: environment.backgroundColor }]}>
        {variant ? (
          <Image source={{ uri: variant.imageUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        ) : null}
        {wasNewUnlock ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW!</Text>
          </View>
        ) : (
          <View style={styles.dupeBadge}>
            <Text style={styles.dupeBadgeText}>DUPLICATE</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{environment.name}</Text>
      <View style={styles.pillRow}>
        <RarityTag rarity={environment.rarity} />
        <CategoryPill category={environment.category} compact />
      </View>
      <Text style={styles.kind}>{DISPLAY_KIND_LABELS[environment.displayKind]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatch: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  newBadge: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newBadgeText: {
    ...typography.caption,
    fontWeight: '800',
    color: '#0B2A18',
  },
  dupeBadge: {
    backgroundColor: '#00000066',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dupeBadgeText: {
    ...typography.caption,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  kind: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
