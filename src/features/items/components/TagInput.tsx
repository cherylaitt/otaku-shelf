import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TextField } from '../../../shared/components/TextField';
import { itemsRepository } from '../../../shared/db/repositories/itemsRepository';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  // Offline, local-only suggestions drawn from tags already used elsewhere
  // in the collection — no network call, refreshed on every keystroke since
  // it's a fast in-memory-scale SQLite read for a personal collection.
  const suggestions = useMemo(() => {
    if (!draft.trim()) return [];
    return itemsRepository.suggestTags(draft, tags);
  }, [draft, tags]);

  const commitTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...tags, trimmed]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Tags</Text>
      <View style={styles.inputRow}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Add a tag and press enter"
          onSubmitEditing={() => commitTag(draft)}
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable onPress={() => commitTag(draft)} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      {showDropdown ? (
        <View style={styles.dropdown}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              style={styles.dropdownItem}
              onPress={() => {
                setFocused(false);
                commitTag(suggestion);
              }}
            >
              <Text style={styles.dropdownItemText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {tags.length > 0 ? (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <Pressable key={tag} style={styles.chip} onPress={() => removeTag(tag)}>
              <Text style={styles.chipText}>{tag}</Text>
              <Text style={styles.chipRemove}>×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dropdown: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  chipRemove: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
});
