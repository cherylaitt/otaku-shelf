import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import { CreateGroupScreen } from '../features/groups/screens/CreateGroupScreen';
import { ResizeGroupLayoutScreen } from '../features/groups/screens/ResizeGroupLayoutScreen';
import { ShelfViewScreen } from '../features/shelf/screens/ShelfViewScreen';
import { AddEditItemScreen } from '../features/items/screens/AddEditItemScreen';
import { ItemDetailScreen } from '../features/items/screens/ItemDetailScreen';
import { BarcodeScannerScreen } from '../features/items/screens/BarcodeScannerScreen';
import { colors } from '../shared/theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal', title: 'New Group' }} />
      <Stack.Screen
        name="ResizeGroupLayout"
        component={ResizeGroupLayoutScreen}
        options={{ presentation: 'modal', title: 'Resize Layout' }}
      />
      <Stack.Screen name="ShelfView" component={ShelfViewScreen} options={{ title: 'Shelf' }} />
      <Stack.Screen name="AddEditItem" component={AddEditItemScreen} options={{ presentation: 'modal', title: 'Item' }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item' }} />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScannerScreen}
        options={{ presentation: 'fullScreenModal', title: 'Scan Barcode', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
