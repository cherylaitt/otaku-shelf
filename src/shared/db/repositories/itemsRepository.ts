import { db } from '../client';
import { generateId } from '../../utils/id';
import { CategoryMismatchError, Category, Item, ItemStatus, ItemType, isItemTypeValidForCategory } from '../../types/models';
import { reflowSlots } from '../../utils/gridLayout';
import { groupsRepository } from './groupsRepository';

interface ItemRow {
  id: string;
  groupId: string;
  itemType: ItemType;
  name: string;
  seriesFranchise: string | null;
  imageUri: string | null;
  purchaseAmount: number | null;
  purchaseDate: number | null;
  notes: string | null;
  tags: string;
  status: ItemStatus;
  slotRow: number | null;
  slotCol: number | null;
  barcodeCode: string | null;
  createdAt: number;
  updatedAt: number;
}

function rowToItem(row: ItemRow): Item {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }
  return { ...row, tags };
}

export interface CreateItemInput {
  groupId: string;
  itemType: ItemType;
  name: string;
  seriesFranchise?: string | null;
  imageUri?: string | null;
  purchaseAmount?: number | null;
  purchaseDate?: number | null;
  notes?: string | null;
  tags?: string[];
  status?: ItemStatus;
  barcodeCode?: string | null;
  slotRow?: number | null;
  slotCol?: number | null;
}

export type UpdateItemInput = Partial<Omit<CreateItemInput, 'groupId'>> & {
  groupId?: string;
};

/** Wishlist / sold / on-order items never occupy a grid slot — only 'owned' items may. */
function normalizeSlot(status: ItemStatus, slotRow: number | null, slotCol: number | null) {
  if (status !== 'owned') return { slotRow: null, slotCol: null };
  return { slotRow, slotCol };
}

export const itemsRepository = {
  listByGroup(groupId: string, opts?: { status?: ItemStatus }): Item[] {
    const rows = opts?.status
      ? db.getAllSync<ItemRow>(
          'SELECT * FROM items WHERE groupId = ? AND status = ? ORDER BY createdAt DESC;',
          groupId,
          opts.status
        )
      : db.getAllSync<ItemRow>('SELECT * FROM items WHERE groupId = ? ORDER BY createdAt DESC;', groupId);
    return rows.map(rowToItem);
  },

  listAll(opts?: { status?: ItemStatus; category?: Category; groupId?: string }): Item[] {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let sql = 'SELECT items.* FROM items';
    if (opts?.category) {
      sql += ' JOIN item_groups ON item_groups.id = items.groupId';
      clauses.push('item_groups.category = ?');
      params.push(opts.category);
    }
    if (opts?.status) {
      clauses.push('items.status = ?');
      params.push(opts.status);
    }
    if (opts?.groupId) {
      clauses.push('items.groupId = ?');
      params.push(opts.groupId);
    }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' ORDER BY items.createdAt DESC;';
    const rows = db.getAllSync<ItemRow>(sql, ...(params as []));
    return rows.map(rowToItem);
  },

  getById(id: string): Item | null {
    const row = db.getFirstSync<ItemRow>('SELECT * FROM items WHERE id = ?;', id);
    return row ? rowToItem(row) : null;
  },

  listOwnedUnplaced(groupId: string): Item[] {
    const rows = db.getAllSync<ItemRow>(
      "SELECT * FROM items WHERE groupId = ? AND status = 'owned' AND slotRow IS NULL ORDER BY createdAt DESC;",
      groupId
    );
    return rows.map(rowToItem);
  },

  /**
   * Local, offline autocomplete for the Series/Franchise field — distinct
   * values the user has typed before, filtered by substring (SQLite's LIKE
   * is ASCII case-insensitive by default) and ranked by most recent use.
   * No external API involved; this only ever reads rows already in SQLite.
   */
  suggestSeriesFranchise(query: string, limit = 6): string[] {
    const rows = db.getAllSync<{ seriesFranchise: string }>(
      `SELECT seriesFranchise, MAX(updatedAt) as lastUsed
       FROM items
       WHERE seriesFranchise IS NOT NULL AND seriesFranchise != '' AND seriesFranchise LIKE ?
       GROUP BY seriesFranchise
       ORDER BY lastUsed DESC
       LIMIT ?;`,
      `%${query.trim()}%`,
      limit
    );
    return rows.map((r) => r.seriesFranchise);
  },

  /**
   * Same idea as suggestSeriesFranchise, but for individual tags. Tags are
   * stored as a JSON array per row (not a normalized column), so this reads
   * the tag rows most-recently-updated first and flattens/dedupes in JS
   * rather than trying to LIKE-match a JSON blob directly in SQL.
   */
  suggestTags(query: string, excludeTags: string[] = [], limit = 6): string[] {
    const rows = db.getAllSync<{ tags: string }>('SELECT tags FROM items ORDER BY updatedAt DESC;');
    const excluded = new Set(excludeTags.map((t) => t.toLowerCase()));
    const seen = new Set<string>();
    const lowerQuery = query.trim().toLowerCase();
    const results: string[] = [];
    for (const row of rows) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tags);
      } catch {
        continue;
      }
      for (const tag of tags) {
        const key = tag.toLowerCase();
        if (seen.has(key) || excluded.has(key)) continue;
        if (lowerQuery && !key.includes(lowerQuery)) continue;
        seen.add(key);
        results.push(tag);
        if (results.length >= limit) return results;
      }
    }
    return results;
  },

  create(input: CreateItemInput): Item {
    const group = groupsRepository.getById(input.groupId);
    if (!group) throw new Error(`Group ${input.groupId} not found`);
    if (!isItemTypeValidForCategory(input.itemType, group.category)) {
      throw new CategoryMismatchError(
        `Item type "${input.itemType}" is not valid for a ${group.category} group.`
      );
    }
    const status = input.status ?? 'wishlist';
    const { slotRow, slotCol } = normalizeSlot(status, input.slotRow ?? null, input.slotCol ?? null);
    const now = Date.now();
    const item: Item = {
      id: generateId(),
      groupId: input.groupId,
      itemType: input.itemType,
      name: input.name.trim(),
      seriesFranchise: input.seriesFranchise?.trim() || null,
      imageUri: input.imageUri ?? null,
      purchaseAmount: input.purchaseAmount ?? null,
      purchaseDate: input.purchaseDate ?? null,
      notes: input.notes?.trim() || null,
      tags: input.tags ?? [],
      status,
      slotRow,
      slotCol,
      barcodeCode: input.barcodeCode ?? null,
      createdAt: now,
      updatedAt: now,
    };
    db.runSync(
      `INSERT INTO items
        (id, groupId, itemType, name, seriesFranchise, imageUri, purchaseAmount, purchaseDate, notes, tags, status, slotRow, slotCol, barcodeCode, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      item.id,
      item.groupId,
      item.itemType,
      item.name,
      item.seriesFranchise,
      item.imageUri,
      item.purchaseAmount,
      item.purchaseDate,
      item.notes,
      JSON.stringify(item.tags),
      item.status,
      item.slotRow,
      item.slotCol,
      item.barcodeCode,
      item.createdAt,
      item.updatedAt
    );
    return item;
  },

  update(id: string, patch: UpdateItemInput): Item {
    const existing = itemsRepository.getById(id);
    if (!existing) throw new Error(`Item ${id} not found`);

    const groupId = patch.groupId ?? existing.groupId;
    const group = groupsRepository.getById(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);

    const itemType = patch.itemType ?? existing.itemType;
    if (!isItemTypeValidForCategory(itemType, group.category)) {
      throw new CategoryMismatchError(
        `Item type "${itemType}" is not valid for a ${group.category} group.`
      );
    }

    const status = patch.status ?? existing.status;
    const rawSlotRow = patch.slotRow !== undefined ? patch.slotRow : existing.slotRow;
    const rawSlotCol = patch.slotCol !== undefined ? patch.slotCol : existing.slotCol;
    const { slotRow, slotCol } = normalizeSlot(status, rawSlotRow, rawSlotCol);

    const updated: Item = {
      ...existing,
      groupId,
      itemType,
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      seriesFranchise:
        patch.seriesFranchise !== undefined ? patch.seriesFranchise?.trim() || null : existing.seriesFranchise,
      imageUri: patch.imageUri !== undefined ? patch.imageUri : existing.imageUri,
      purchaseAmount: patch.purchaseAmount !== undefined ? patch.purchaseAmount : existing.purchaseAmount,
      purchaseDate: patch.purchaseDate !== undefined ? patch.purchaseDate : existing.purchaseDate,
      notes: patch.notes !== undefined ? patch.notes?.trim() || null : existing.notes,
      tags: patch.tags !== undefined ? patch.tags : existing.tags,
      status,
      slotRow,
      slotCol,
      barcodeCode: patch.barcodeCode !== undefined ? patch.barcodeCode : existing.barcodeCode,
      updatedAt: Date.now(),
    };

    db.runSync(
      `UPDATE items SET
        groupId = ?, itemType = ?, name = ?, seriesFranchise = ?, imageUri = ?, purchaseAmount = ?,
        purchaseDate = ?, notes = ?, tags = ?, status = ?, slotRow = ?, slotCol = ?, barcodeCode = ?, updatedAt = ?
       WHERE id = ?;`,
      updated.groupId,
      updated.itemType,
      updated.name,
      updated.seriesFranchise,
      updated.imageUri,
      updated.purchaseAmount,
      updated.purchaseDate,
      updated.notes,
      JSON.stringify(updated.tags),
      updated.status,
      updated.slotRow,
      updated.slotCol,
      updated.barcodeCode,
      updated.updatedAt,
      id
    );
    return updated;
  },

  /** Changing status away from 'owned' always clears the grid slot (wishlist/sold/on-order never occupy one). */
  setStatus(id: string, status: ItemStatus): Item {
    return itemsRepository.update(id, { status });
  },

  /**
   * Places (or moves) an item into a slot, marking it 'owned'. If another
   * item already occupies that slot in the same group, the two items swap
   * positions (the occupant takes the mover's previous slot, or becomes
   * unplaced if the mover had none).
   */
  placeInSlot(itemId: string, row: number, col: number): Item {
    const item = itemsRepository.getById(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);

    const occupant = db.getFirstSync<ItemRow>(
      'SELECT * FROM items WHERE groupId = ? AND slotRow = ? AND slotCol = ? AND id != ?;',
      item.groupId,
      row,
      col,
      itemId
    );

    if (occupant) {
      itemsRepository.update(occupant.id, { status: 'owned', slotRow: item.slotRow, slotCol: item.slotCol });
    }
    return itemsRepository.update(itemId, { status: 'owned', slotRow: row, slotCol: col });
  },

  removeFromSlot(itemId: string): Item {
    return itemsRepository.update(itemId, { slotRow: null, slotCol: null });
  },

  /**
   * Called by the "Resize Layout" flow (via useGroupsStore.resizeGroup)
   * immediately after a group's `rows`/`columns` change in the DB. Repacks
   * every currently-placed item in the group into the new dimensions —
   * see `reflowSlots` for the shrink/grow/merge semantics. A no-op if the
   * group has no placed items yet.
   */
  reflowForGroup(groupId: string, rows: number, columns: number): void {
    const placed = db.getAllSync<ItemRow>(
      "SELECT * FROM items WHERE groupId = ? AND status = 'owned' AND slotRow IS NOT NULL ORDER BY slotRow, slotCol;",
      groupId
    );
    if (placed.length === 0) return;
    const newPositions = reflowSlots(rows, columns, placed);
    db.withTransactionSync(() => {
      for (const pos of newPositions) {
        db.runSync('UPDATE items SET slotRow = ?, slotCol = ? WHERE id = ?;', pos.slotRow, pos.slotCol, pos.id);
      }
    });
  },

  remove(id: string): void {
    db.runSync('DELETE FROM items WHERE id = ?;', id);
  },
};
