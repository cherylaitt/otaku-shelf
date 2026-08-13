import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Button } from '../../../shared/components/Button';
import { resetAllData } from '../../../shared/db/client';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { useItemsStore } from '../../items/store/useItemsStore';
import { useEnvironmentsStore } from '../../../shared/store/useEnvironmentsStore';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';

export function SettingsScreen() {
  const refreshGroups = useGroupsStore((s) => s.refresh);
  const refreshItems = useItemsStore((s) => s.refresh);
  const refreshEnvironments = useEnvironmentsStore((s) => s.refresh);

  // expo-updates: `checkAutomatically` (default ON_LOAD) already checks on
  // every launch and downloads silently in the background — this button is
  // just a convenient on-demand check for testing/QA, it doesn't replace
  // that startup behavior.
  const { currentlyRunning, isUpdatePending } = Updates.useUpdates();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckForUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(
        'Not Available Here',
        'Update checks only work in a built app (dev/preview/production), not in this development environment.'
      );
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert('Up to Date', "You're already running the latest published update for this build.");
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert('Update Ready', 'A new update was downloaded. Restart now to apply it?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
      ]);
    } catch (e) {
      Alert.alert('Update Check Failed', e instanceof Error ? e.message : 'Please try again later.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This permanently deletes every group, item, and gacha history entry. Your unlocked environment catalog will also reset. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            // Re-seed the starter catalog so the app isn't left with zero environments.
            import('../../../shared/db/migrate').then(({ initDatabase }) => {
              initDatabase();
              refreshGroups();
              refreshItems();
              refreshEnvironments();
              Alert.alert('Done', 'All local data has been reset.');
            });
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Data</Text>
        <Text style={styles.sectionBody}>
          Everything is stored locally on this device (SQLite + your photos in app storage). There is no cloud sync in
          this MVP.
        </Text>
        <Button label="Reset All Local Data" variant="danger" onPress={handleReset} style={styles.resetButton} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Software Update</Text>
        <Text style={styles.sectionBody}>
          {currentlyRunning.isEmbeddedLaunch
            ? 'Running the version built into this app.'
            : 'Running a downloaded update.'}
          {Updates.channel ? ` Channel: ${Updates.channel}.` : ''}
        </Text>
        {isUpdatePending ? (
          <Text style={styles.sectionBody}>An update has been downloaded — restart the app to apply it.</Text>
        ) : null}
        <Button
          label="Check for Updates"
          variant="secondary"
          onPress={handleCheckForUpdate}
          loading={checkingUpdate}
          style={styles.resetButton}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <Text style={styles.sectionBody}>Otaku Shelf v1.0.0</Text>
        <Text style={styles.sectionBody}>
          Ads are mocked for this MVP via MockAdService (see src/shared/services/adService.ts) — swap in a real ad
          SDK there without touching any screen code.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  resetButton: {
    marginTop: spacing.sm,
  },
});
