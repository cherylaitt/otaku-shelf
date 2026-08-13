import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInputProps, View } from 'react-native';
import { TextField } from './TextField';
import { colors, radius, spacing, typography } from '../theme/theme';

interface AutocompleteFieldProps extends TextInputProps {
  label?: string;
  suggestions: string[];
  onSelectSuggestion: (value: string) => void;
}

/**
 * A TextField with a local suggestions dropdown underneath it. Entirely
 * offline — the caller is responsible for computing `suggestions` (e.g.
 * from previously-entered values already in SQLite), this component only
 * handles showing/hiding the list and forwarding taps.
 */
export function AutocompleteField({
  label,
  suggestions,
  onSelectSuggestion,
  value,
  onChangeText,
  onFocus,
  onBlur,
  style,
  ...rest
}: AutocompleteFieldProps) {
  const [focused, setFocused] = useState(false);
  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          // Delay so a tap on a suggestion below still registers as a press
          // before the dropdown unmounts (blur fires first on most platforms).
          setTimeout(() => setFocused(false), 150);
          onBlur?.(e);
        }}
        style={style}
        {...rest}
      />
      {showDropdown ? (
        <View style={styles.dropdown}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              style={styles.dropdownItem}
              onPress={() => {
                setFocused(false);
                onSelectSuggestion(suggestion);
              }}
            >
              <Text style={styles.dropdownItemText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  dropdown: {
    marginTop: spacing.xs,
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
});
