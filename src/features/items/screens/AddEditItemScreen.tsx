/**
 * Add/Edit Item — manual-first by design.
 *
 * General-purpose UPC/barcode databases are built for mass-market retail
 * goods and essentially never contain anime/idol collectibles (figures,
 * acrylic stands, doujin cards, event-exclusive goods). An earlier version
 * of this screen tried a "scan to auto-fill" product lookup API, but it
 * returned "not found" for nearly every real item in this app's use case —
 * so that integration was deliberately removed, not left unfinished.
 *
 * Barcode scanning itself is still useful, just repurposed: it captures the
 * code as a local reference field (searchable in the Inventory List, e.g.
 * "have I already logged this exact barcode?"), with zero network calls.
 * Manual entry — helped along by local, offline autocomplete on
 * Series/Franchise and Tags drawn from the user's own past entries — is the
 * one, fully-supported path for populating item details.
 */
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../../../navigation/types';
import { useGroupsStore } from '../../groups/store/useGroupsStore';
import { useItemsStore } from '../store/useItemsStore';
import { useBarcodeScanStore } from '../store/useBarcodeScanStore';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { TextField } from '../../../shared/components/TextField';
import { AutocompleteField } from '../../../shared/components/AutocompleteField';
import { Button } from '../../../shared/components/Button';
import { ItemTypePicker } from '../components/ItemTypePicker';
import { StatusSelector } from '../components/StatusSelector';
import { TagInput } from '../components/TagInput';
import { SlotPickerModal } from '../../shelf/components/SlotPickerModal';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { CategoryMismatchError, ItemStatus, ItemType } from '../../../shared/types/models';
import { imageService } from '../../../shared/services/imageService';
import { itemsRepository } from '../../../shared/db/repositories/itemsRepository';
import { formatDate } from '../../../shared/utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddEditItem'>;

export function AddEditItemScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, itemId, presetSlot } = route.params;

  const group = useGroupsStore((s) => s.getGroupById(groupId));
  const items = useItemsStore((s) => s.items);
  const addItem = useItemsStore((s) => s.addItem);
  const updateItem = useItemsStore((s) => s.updateItem);
  const placeInSlot = useItemsStore((s) => s.placeInSlot);

  const existingItem = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);
  const isEditing = !!existingItem;

  const [itemType, setItemType] = useState<ItemType | null>(existingItem?.itemType ?? null);
  const [name, setName] = useState(existingItem?.name ?? '');
  const [seriesFranchise, setSeriesFranchise] = useState(existingItem?.seriesFranchise ?? '');
  const [imageUri, setImageUri] = useState<string | null>(existingItem?.imageUri ?? null);
  const [purchaseAmount, setPurchaseAmount] = useState(
    existingItem?.purchaseAmount != null ? String(existingItem.purchaseAmount) : ''
  );
  const [purchaseDate, setPurchaseDate] = useState<number | null>(existingItem?.purchaseDate ?? null);
  const [notes, setNotes] = useState(existingItem?.notes ?? '');
  const [tags, setTags] = useState<string[]>(existingItem?.tags ?? []);
  const [status, setStatus] = useState<ItemStatus>(existingItem?.status ?? 'owned');
  const [barcodeCode, setBarcodeCode] = useState<string | null>(existingItem?.barcodeCode ?? null);
  const [justScanned, setJustScanned] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showBarcodeHint, setShowBarcodeHint] = useState(false);

  const [slotPickerFor, setSlotPickerFor] = useState<string | null>(null);

  const lastScan = useBarcodeScanStore((s) => s.lastScan);
  const clearScan = useBarcodeScanStore((s) => s.clearScan);

  const seriesSuggestions = useMemo(
    () => (seriesFranchise.trim() ? itemsRepository.suggestSeriesFranchise(seriesFranchise) : []),
    [seriesFranchise]
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Item' : 'Add Item' });
  }, [navigation, isEditing]);

  // Reference-only capture: a scan simply records the decoded code and shows
  // a brief "saved" confirmation. No lookup, no network call, no auto-fill of
  // any other field — the user always proceeds with manual entry below.
  //
  // `clearScan()` runs immediately after copying the value into local state
  // (`barcodeCode`) — see useBarcodeScanStore for why that's required: this
  // global store persists across screen mounts/unmounts, so leaving it
  // unconsumed would leak Item A's scanned code into Item B's fresh form.
  useEffect(() => {
    if (!lastScan) return;
    setBarcodeCode(lastScan.code);
    setJustScanned(true);
    clearScan();
    const timeoutId = setTimeout(() => setJustScanned(false), 2500);
    return () => clearTimeout(timeoutId);
  }, [lastScan, clearScan]);

  if (!group) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.errorText}>Group not found.</Text>
      </ScreenContainer>
    );
  }

  const handlePickCamera = async () => {
    const result = await imageService.pickFromCamera();
    if (result.status === 'success') setImageUri(result.uri);
    else if (result.status === 'permission-denied') {
      Alert.alert('Camera Access Needed', 'Enable camera access in Settings to take photos of your items.');
    }
  };

  const handlePickGallery = async () => {
    const result = await imageService.pickFromGallery();
    if (result.status === 'success') setImageUri(result.uri);
    else if (result.status === 'permission-denied') {
      Alert.alert('Photo Access Needed', 'Enable photo library access in Settings to choose images.');
    }
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setPurchaseDate(selectedDate.getTime());
  };

  const handleSave = () => {
    setErrorText(null);
    if (!itemType) {
      setErrorText('Choose an item type.');
      return;
    }
    if (!name.trim()) {
      setErrorText('Give the item a name.');
      return;
    }

    const basePayload = {
      groupId,
      itemType,
      name,
      seriesFranchise: seriesFranchise || null,
      imageUri,
      purchaseAmount: purchaseAmount.trim() ? parseFloat(purchaseAmount) : null,
      purchaseDate,
      notes: notes || null,
      tags,
      status,
      barcodeCode,
    };

    try {
      let saved;
      if (existingItem) {
        saved = updateItem(existingItem.id, basePayload);
      } else if (status === 'owned' && presetSlot) {
        saved = addItem({ ...basePayload, slotRow: presetSlot.row, slotCol: presetSlot.col });
      } else {
        saved = addItem(basePayload);
      }

      if (saved.status === 'owned' && saved.slotRow === null) {
        setSlotPickerFor(saved.id);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      if (e instanceof CategoryMismatchError) {
        setErrorText(e.message);
      } else {
        Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
      }
    }
  };

  const placedGroupItems = items.filter(
    (i) => i.groupId === groupId && i.status === 'owned' && i.slotRow !== null && i.id !== slotPickerFor
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ItemTypePicker category={group.category} value={itemType} onChange={setItemType} />

        <View style={styles.photoSection}>
          <Text style={styles.sectionLabel}>Photo</Text>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
          ) : (
            <View style={[styles.photoPreview, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>No photo yet</Text>
            </View>
          )}
          <View style={styles.photoButtonsRow}>
            <Button label="Take Photo" variant="secondary" onPress={handlePickCamera} style={styles.photoButton} />
            <Button label="Choose from Gallery" variant="secondary" onPress={handlePickGallery} style={styles.photoButton} />
          </View>
        </View>

        <View style={styles.barcodeSection}>
          <Text style={styles.sectionLabel}>Barcode</Text>
          <View style={styles.barcodeRow}>
            <Button
              label="Scan Barcode"
              variant="secondary"
              onPress={() => navigation.navigate('BarcodeScanner')}
              style={styles.barcodeButton}
            />
            <Pressable
              hitSlop={8}
              onPress={() => setShowBarcodeHint((v) => !v)}
              style={styles.infoIcon}
              accessibilityLabel="About barcode scanning"
            >
              <Text style={styles.infoIconText}>ⓘ</Text>
            </Pressable>
          </View>

          {showBarcodeHint ? (
            <Text style={styles.barcodeHintText}>
              Scanning saves the code for your own reference — you&apos;ll still enter details manually, since
              collectibles usually aren&apos;t in retail databases.
            </Text>
          ) : null}

          {barcodeCode ? (
            <View style={styles.barcodeResultBox}>
              <Text style={styles.barcodeScannedText}>
                {justScanned ? `Scanned: ${barcodeCode} — saved for reference` : `Reference code: ${barcodeCode}`}
              </Text>
            </View>
          ) : null}
        </View>

        <TextField label="Name" placeholder="e.g. Klee Acrylic Stand" value={name} onChangeText={setName} />
        <AutocompleteField
          label="Series / Franchise"
          placeholder="e.g. Genshin Impact"
          value={seriesFranchise}
          onChangeText={setSeriesFranchise}
          suggestions={seriesSuggestions.filter((s) => s !== seriesFranchise)}
          onSelectSuggestion={setSeriesFranchise}
        />

        <View style={styles.row2}>
          <View style={styles.row2Field}>
            <TextField
              label="Purchase Amount"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={purchaseAmount}
              onChangeText={setPurchaseAmount}
            />
          </View>
          <Pressable style={styles.row2Field} onPress={() => setShowDatePicker(true)}>
            <TextField
              label="Purchase Date"
              value={purchaseDate ? formatDate(purchaseDate) : ''}
              placeholder="Select date"
              editable={false}
              pointerEvents="none"
            />
          </Pressable>
        </View>

        {showDatePicker ? (
          <View>
            <DateTimePicker
              value={purchaseDate ? new Date(purchaseDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={onChangeDate}
            />
            {Platform.OS === 'ios' ? (
              <Button label="Done" variant="ghost" onPress={() => setShowDatePicker(false)} />
            ) : null}
          </View>
        ) : null}

        <TextField
          label="Notes"
          placeholder="Optional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />

        <TagInput tags={tags} onChange={setTags} />

        <StatusSelector value={status} onChange={setStatus} />

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <Button label={isEditing ? 'Save Changes' : 'Add Item'} onPress={handleSave} fullWidth style={styles.saveButton} />
      </ScrollView>

      <SlotPickerModal
        visible={slotPickerFor !== null}
        rows={group.rows}
        columns={group.columns}
        occupiedItems={placedGroupItems}
        onSelect={(row, col) => {
          if (slotPickerFor) placeInSlot(slotPickerFor, row, col);
          setSlotPickerFor(null);
          navigation.goBack();
        }}
        onSkip={() => {
          setSlotPickerFor(null);
          navigation.goBack();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  photoSection: {},
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoButton: {
    flex: 1,
  },
  barcodeSection: {
    gap: spacing.sm,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barcodeButton: {
    alignSelf: 'flex-start',
  },
  infoIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  barcodeHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.bgCard,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  barcodeResultBox: {
    gap: 4,
  },
  barcodeScannedText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  row2Field: {
    flex: 1,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
