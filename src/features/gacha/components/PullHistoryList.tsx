import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RarityTag } from '../../../shared/components/RarityTag';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { Environment, GachaPullLog } from '../../../shared/types/models';
import { formatDateTime } from '../../../shared/utils/format';

interface PullHistoryListProps {
  history: GachaPullLog[];
  environmentsById: Map<string, Environment>;
}

export function PullHistoryList({ history, environmentsById }: PullHistoryListProps) {
  if (history.length === 0) {
    return <Text style={styles.empty}>No pulls yet — your history will show up here.</Text>;
  }

  return (
    <View style={styles.list}>
      {history.map((log) => {
        const env = environmentsById.get(log.resultEnvironmentId);
        return (
          <View key={log.id} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowName} numberOfLines={1}>
                {env?.name ?? 'Unknown environment'}
              </Text>
              <Text style={styles.rowTime}>{formatDateTime(log.timestamp)}</Text>
            </View>
            <View style={styles.rowRight}>
              {log.wasNewUnlock ? (
                <View style={styles.newTag}>
                  <Text style={styles.newTagText}>NEW</Text>
                </View>
              ) : (
                <View style={styles.dupeTag}>
                  <Text style={styles.dupeTagText}>DUPE</Text>
                </View>
              )}
              {env ? <RarityTag rarity={env.rarity} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLeft: {
    flexShrink: 1,
    gap: 2,
  },
  rowName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  rowTime: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newTag: {
    backgroundColor: colors.success + '33',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newTagText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  dupeTag: {
    backgroundColor: colors.textMuted + '33',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dupeTagText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
});
