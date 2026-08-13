import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useGroupsStore } from '../store/useGroupsStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { TextField } from '../../../shared/components/TextField';
import { Button } from '../../../shared/components/Button';
import { GridPresetPicker } from '../../../shared/components/GridPresetPicker';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_SUBTEXT,
  Category,
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  GRID_COLUMN_PRESETS,
  GRID_ROW_PRESETS,
} from '../../../shared/types/models';
import { categoryColor, categorySoftColor } from '../../../shared/theme/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CreateGroupScreen() {
  const navigation = useNavigation<Nav>();
  const createGroup = useGroupsStore((s) => s.createGroup);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [rows, setRows] = useState<number>(DEFAULT_GRID_ROWS);
  const [columns, setColumns] = useState<number>(DEFAULT_GRID_COLUMNS);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => name.trim().length > 0 && category !== null, [name, category]);

  const handleCreate = () => {
    if (!category) {
      setError('Choose a category to continue.');
      return;
    }
    if (!name.trim()) {
      setError('Give your group a name.');
      return;
    }
    const group = createGroup({ name, category, rows, columns });
    navigation.replace('ShelfView', { groupId: group.id });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>New Group</Text>
        <Text style={styles.subtitle}>
          Groups are permanent collections. Category can&apos;t be changed after creation.
        </Text>

        <TextField
          label="Group name"
          placeholder="e.g. Genshin Impact Cards"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          {CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  setError(null);
                }}
                style={[
                  styles.categoryOption,
                  { borderColor: selected ? categoryColor(cat) : colors.border },
                  selected && { backgroundColor: categorySoftColor(cat) },
                ]}
              >
                <View style={[styles.radioOuter, selected && { borderColor: categoryColor(cat) }]}>
                  {selected ? <View style={[styles.radioInner, { backgroundColor: categoryColor(cat) }]} /> : null}
                </View>
                <View style={styles.categoryTextWrap}>
                  <Text style={styles.categoryLabel}>{CATEGORY_LABELS[cat]}</Text>
                  <Text style={styles.categorySubtext}>{CATEGORY_SUBTEXT[cat]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <GridPresetPicker
          label="Rows"
          hint="Your shelf's fixed height. You can change this later from Resize Layout — existing cards will reflow automatically."
          presets={GRID_ROW_PRESETS}
          value={rows}
          onChange={setRows}
        />

        <GridPresetPicker
          label="Columns"
          hint="Your shelf's fixed width. Also changeable later from Resize Layout."
          presets={GRID_COLUMN_PRESETS}
          value={columns}
          onChange={setColumns}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Create Group" onPress={handleCreate} disabled={!canCreate} fullWidth style={styles.createBtn} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.bgElevated,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryTextWrap: {
    flex: 1,
    gap: 2,
  },
  categoryLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  categorySubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  createBtn: {
    marginTop: spacing.sm,
  },
});
