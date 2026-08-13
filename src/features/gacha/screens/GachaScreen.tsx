import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { GachaCategoryPanel } from '../components/GachaCategoryPanel';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { Category } from '../../../shared/types/models';

export function GachaScreen() {
  const [category, setCategory] = useState<Category>('paper');

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Gacha</Text>
        <Text style={styles.subtitle}>Paper and Figure pulls are entirely independent pools.</Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedControl
          segments={[
            { value: 'paper' as const, label: 'Paper Goods Pulls' },
            { value: 'figure' as const, label: 'Figure Goods Pulls' },
          ]}
          value={category}
          onChange={setCategory}
        />
      </View>

      <GachaCategoryPanel category={category} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabsWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
