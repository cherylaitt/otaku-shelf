import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { ScreenContainer } from '../../../shared/components/ScreenContainer';
import { Button } from '../../../shared/components/Button';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { useBarcodeScanStore } from '../store/useBarcodeScanStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// How long to hold on this screen showing "Scanned: ..." before returning to
// the form, so the user gets instant, unambiguous confirmation that the
// camera/decoder itself worked. The scanned code is purely a local
// reference value on the Item — there's no lookup step, so this screen
// never needs to show a failure/"not found" state.
const SCAN_CONFIRMATION_MS = 700;

export function BarcodeScannerScreen() {
  const navigation = useNavigation<Nav>();
  const [permission, requestPermission] = useCameraPermissions();
  const setScan = useBarcodeScanStore((s) => s.setScan);
  const hasHandledScan = useRef(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasHandledScan.current) return;
    hasHandledScan.current = true;
    setScannedCode(data);
    setScan(data);
  };

  useEffect(() => {
    if (!scannedCode) return;
    const timeoutId = setTimeout(() => navigation.goBack(), SCAN_CONFIRMATION_MS);
    return () => clearTimeout(timeoutId);
  }, [scannedCode, navigation]);

  if (!permission) {
    return <ScreenContainer />;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer style={styles.centerScreen}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Otaku Shelf needs camera access to scan barcodes. You can still add items manually without it.
        </Text>
        <Button label="Grant Camera Access" onPress={requestPermission} style={styles.permissionButton} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.frame, scannedCode && styles.frameSuccess]} />
        {scannedCode ? (
          <Text style={styles.hintSuccess}>✓ Scanned: {scannedCode}</Text>
        ) : (
          <Text style={styles.hint}>Align the barcode within the frame</Text>
        )}
      </View>
      <View style={styles.footer}>
        <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  permissionBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  frame: {
    width: 260,
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#FFFFFFCC',
  },
  frameSuccess: {
    borderColor: colors.success,
  },
  hint: {
    ...typography.body,
    color: '#FFFFFF',
    backgroundColor: '#00000088',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  hintSuccess: {
    ...typography.subtitle,
    color: '#FFFFFF',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
});
