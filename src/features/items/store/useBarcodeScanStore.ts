import { create } from 'zustand';

interface ScanEvent {
  code: string;
  ts: number;
}

interface BarcodeScanState {
  lastScan: ScanEvent | null;
  setScan: (code: string) => void;
  clearScan: () => void;
}

/**
 * Bridges the BarcodeScanner screen back to whichever Add/Edit Item screen
 * is waiting for a result, without pushing non-serializable callbacks
 * through React Navigation params.
 *
 * This store is a consume-once mailbox, not a source of truth: unlike this
 * store, every Add/Edit Item form field lives in that screen's own local
 * `useState` and therefore resets automatically whenever the screen mounts
 * fresh for a different item. `lastScan` would NOT reset on its own — it's
 * a module-level Zustand store that outlives any single screen instance —
 * so whichever screen reads it MUST call `clearScan()` immediately after
 * copying the value into its own local state. Otherwise a stale scan from
 * a previously-saved item silently reappears the next time Add Item opens.
 */
export const useBarcodeScanStore = create<BarcodeScanState>((set) => ({
  lastScan: null,
  setScan: (code) => set({ lastScan: { code, ts: Date.now() } }),
  clearScan: () => set({ lastScan: null }),
}));
