import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Rarity, RARITY_COLORS, RARITY_LABELS } from '../types/models';
import { radius, spacing, typography } from '../theme/theme';

export function RarityTag({ rarity }: { rarity: Rarity }) {
  const color = RARITY_COLORS[rarity];
  return (
    <View style={[styles.tag, { borderColor: color, backgroundColor: color + '26' }]}>
      <Text style={[styles.text, { color }]}>{RARITY_LABELS[rarity].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
