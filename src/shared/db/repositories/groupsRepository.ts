import { db } from '../client';
import { generateId } from '../../utils/id';
import { Category, Group } from '../../types/models';

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  rows: number;
  columns: number;
  createdAt: number;
}

function rowToGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    rows: row.rows,
    columns: row.columns,
    createdAt: row.createdAt,
  };
}

export interface CreateGroupInput {
  name: string;
  description?: string | null;
  category: Category;
  rows: number;
  columns: number;
}

export const groupsRepository = {
  listAll(): Group[] {
    const rows = db.getAllSync<GroupRow>('SELECT * FROM item_groups ORDER BY createdAt DESC;');
    return rows.map(rowToGroup);
  },

  getById(id: string): Group | null {
    const row = db.getFirstSync<GroupRow>('SELECT * FROM item_groups WHERE id = ?;', id);
    return row ? rowToGroup(row) : null;
  },

  /** Category is set here and immutable thereafter — there is no `updateCategory`. `rows`/`columns` start here but can change later via `resize`. */
  create(input: CreateGroupInput): Group {
    const group: Group = {
      id: generateId(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      rows: input.rows,
      columns: input.columns,
      createdAt: Date.now(),
    };
    db.runSync(
      `INSERT INTO item_groups (id, name, description, category, rows, columns, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      group.id,
      group.name,
      group.description,
      group.category,
      group.rows,
      group.columns,
      group.createdAt
    );
    return group;
  },

  /** Name/description only — category and id are permanently locked after creation. */
  updateDetails(id: string, patch: { name?: string; description?: string | null }): Group {
    const existing = groupsRepository.getById(id);
    if (!existing) throw new Error(`Group ${id} not found`);
    const name = patch.name !== undefined ? patch.name.trim() : existing.name;
    const description = patch.description !== undefined ? patch.description?.trim() || null : existing.description;
    db.runSync('UPDATE item_groups SET name = ?, description = ? WHERE id = ?;', name, description, id);
    return { ...existing, name, description };
  },

  /**
   * Changes the group's fixed grid size ("Resize Layout"). This only updates
   * the stored dimensions — it deliberately does NOT touch item placements
   * itself, so this repository never needs to import `itemsRepository`
   * (which already imports this one, for category checks). Callers must
   * follow up with `itemsRepository.reflowForGroup(id, rows, columns)`;
   * `useGroupsStore.resizeGroup` does both together.
   */
  resize(id: string, rows: number, columns: number): Group {
    const existing = groupsRepository.getById(id);
    if (!existing) throw new Error(`Group ${id} not found`);
    db.runSync('UPDATE item_groups SET rows = ?, columns = ? WHERE id = ?;', rows, columns, id);
    return { ...existing, rows, columns };
  },

  /** Cascades to delete all items belonging to the group (enforced by FK ON DELETE CASCADE). */
  remove(id: string): void {
    db.runSync('DELETE FROM item_groups WHERE id = ?;', id);
  },
};
