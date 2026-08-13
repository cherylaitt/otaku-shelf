/**
 * Fixed-grid shelf layout math.
 *
 * A Group's `rows x columns` grid is fixed (chosen at creation, changed only
 * via the explicit "Resize Layout" flow — see `groupsRepository.resize`).
 * A single page always holds exactly `rows * columns` slots; when there are
 * more placed items than one page can hold, the rest overflow onto
 * additional pages, in the same reading order.
 */

/** Total pages needed to hold `placedCount` items at `rows x columns` per page (always at least 1, even when empty). */
export function computeTotalPages(rows: number, columns: number, placedCount: number): number {
  const perPage = Math.max(1, rows * columns);
  return Math.max(1, Math.ceil(placedCount / perPage));
}

interface SlotLike {
  id: string;
  slotRow: number | null;
  slotCol: number | null;
}

interface ReflowedSlot {
  id: string;
  slotRow: number;
  slotCol: number;
}

/**
 * Repacks `items` into a `rows x columns` grid, filling pages in row-major
 * order (left-to-right, top-to-bottom, page by page). Order is taken from
 * each item's CURRENT `slotRow`/`slotCol` — never a cached/prior snapshot —
 * so calling this repeatedly (e.g. resizing a layout several times in a
 * row) always reflows from the latest real state, and only items that were
 * already placed (non-null slot) participate; unplaced items are untouched.
 *
 * This single function covers both resize directions described in the
 * product spec:
 *  - Shrinking: whatever no longer fits on a page overflows onto the next
 *    page in order — nothing is dropped, nothing blocks the resize.
 *  - Growing: items are re-flowed from scratch against the new (larger)
 *    page size, which naturally merges previously-overflowed pages back
 *    together wherever the new capacity allows.
 *
 * Returns only the { id, slotRow, slotCol } deltas — callers persist them.
 */
export function reflowSlots(rows: number, columns: number, items: SlotLike[]): ReflowedSlot[] {
  const perPage = Math.max(1, rows * columns);
  const ordered = items
    .filter((i): i is SlotLike & { slotRow: number; slotCol: number } => i.slotRow !== null && i.slotCol !== null)
    .sort((a, b) => a.slotRow - b.slotRow || a.slotCol - b.slotCol);

  return ordered.map((item, index) => {
    const page = Math.floor(index / perPage);
    const posInPage = index % perPage;
    const localRow = Math.floor(posInPage / columns);
    const col = posInPage % columns;
    return { id: item.id, slotRow: page * rows + localRow, slotCol: col };
  });
}
