import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGachaStore } from '../store/useGachaStore';
import { useEnvironmentsStore } from '../../../shared/store/useEnvironmentsStore';
import { Button } from '../../../shared/components/Button';
import { GachaRevealCard } from './GachaRevealCard';
import { PullHistoryList } from './PullHistoryList';
import { CATEGORY_LABELS, Category } from '../../../shared/types/models';
import { categoryColor, colors, spacing, typography } from '../../../shared/theme/theme';

export function GachaCategoryPanel({ category }: { category: Category }) {
  const pulling = useGachaStore((s) => s.pullingByCategory[category]);
  const lastResult = useGachaStore((s) => s.lastResultByCategory[category]);
  const history = useGachaStore((s) => s.historyByCategory[category]);
  const pull = useGachaStore((s) => s.pull);
  const refreshHistory = useGachaStore((s) => s.refreshHistory);
  const environments = useEnvironmentsStore((s) => s.environments);
  const refreshEnvironments = useEnvironmentsStore((s) => s.refresh);

  const environmentsById = useMemo(() => new Map(environments.map((e) => [e.id, e])), [environments]);
  const unlockedCount = useMemo(
    () => environments.filter((e) => e.category === category && e.isUnlocked).length,
    [environments, category]
  );
  const totalCount = useMemo(() => environments.filter((e) => e.category === category).length, [environments, category]);

  useFocusEffect(
    useCallback(() => {
      refreshHistory(category);
      refreshEnvironments();
    }, [category, refreshHistory, refreshEnvironments])
  );

  const handlePull = () => {
    pull(category);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {unlockedCount} / {totalCount} {CATEGORY_LABELS[category].toLowerCase()} environments unlocked
        </Text>
      </View>

      <Button
        label={pulling ? 'Watching Ad…' : 'Watch Ad for a Pull'}
        onPress={handlePull}
        loading={pulling}
        disabled={pulling}
        fullWidth
        style={[styles.pullButton, { backgroundColor: categoryColor(category) }]}
      />

      <View style={styles.revealArea}>
        {lastResult ? (
          <GachaRevealCard
            environment={lastResult.environment}
            wasNewUnlock={lastResult.wasNewUnlock}
            revealKey={`${lastResult.environment.id}-${history[0]?.timestamp ?? 0}`}
          />
        ) : (
          <Text style={styles.placeholderText}>Watch an ad to pull a {CATEGORY_LABELS[category].toLowerCase()} skin.</Text>
        )}
      </View>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Pull History</Text>
        <PullHistoryList history={history} environmentsById={environmentsById} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summary: {
    alignItems: 'center',
  },
  summaryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pullButton: {
    borderRadius: 14,
  },
  revealArea: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  historySection: {
    gap: spacing.sm,
  },
  historyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
});
