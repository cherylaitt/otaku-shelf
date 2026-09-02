import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/shared/db/migrate';
import { useGroupsStore } from './src/features/groups/store/useGroupsStore';
import { useItemsStore } from './src/features/items/store/useItemsStore';
import { initializeAds } from './src/shared/services/ads';
import { colors } from './src/shared/theme/theme';

const navigationTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.textPrimary,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase();
    useGroupsStore.getState().refresh();
    useItemsStore.getState().refresh();
    setReady(true);
    // Ads aren't on the critical startup path (only the Inventory tab shows
    // one) — fire-and-forget so a slow ATT prompt/SDK init never delays the
    // very first screen the user sees.
    initializeAds();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flexFill}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
