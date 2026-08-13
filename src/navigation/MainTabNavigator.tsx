import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { GroupListScreen } from '../features/groups/screens/GroupListScreen';
import { InventoryScreen } from '../features/inventory/screens/InventoryScreen';
import { SoldArchiveScreen } from '../features/inventory/screens/SoldArchiveScreen';
import { GachaScreen } from '../features/gacha/screens/GachaScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { colors } from '../shared/theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  GroupsTab: '🗂️',
  InventoryTab: '📋',
  GachaTab: '🎰',
  SoldTab: '🗃️',
  SettingsTab: '⚙️',
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="GroupsTab" component={GroupListScreen} options={{ title: 'Groups' }} />
      <Tab.Screen name="InventoryTab" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <Tab.Screen name="GachaTab" component={GachaScreen} options={{ title: 'Gacha' }} />
      <Tab.Screen name="SoldTab" component={SoldArchiveScreen} options={{ title: 'Archive' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
