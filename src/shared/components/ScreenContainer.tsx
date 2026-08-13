import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/theme';

export function ScreenContainer({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 50,
    backgroundColor: colors.bg,
  },
});
