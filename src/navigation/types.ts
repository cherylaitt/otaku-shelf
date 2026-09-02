export type RootStackParamList = {
  MainTabs: undefined;
  CreateGroup: undefined;
  ShelfView: { groupId: string };
  ResizeGroupLayout: { groupId: string };
  AddEditItem: { groupId: string; itemId?: string; presetSlot?: { row: number; col: number } };
  ItemDetail: { itemId: string };
  BarcodeScanner: undefined;
};

export type MainTabParamList = {
  GroupsTab: undefined;
  InventoryTab: undefined;
  SoldTab: undefined;
  SettingsTab: undefined;
};
