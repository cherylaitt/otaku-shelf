import { db } from '../client';
import { Category, Environment, ShelfBackgroundVariant } from '../../types/models';

interface EnvironmentRow {
  id: string;
  name: string;
  backgroundColor: string;
  category: Category;
  displayKind: Environment['displayKind'];
  rarity: Environment['rarity'];
  isUnlocked: number;
  unlockedAt: number | null;
  backgroundVariants: string;
}

function rowToEnvironment(row: EnvironmentRow): Environment {
  let backgroundVariants: ShelfBackgroundVariant[] = [];
  try {
    backgroundVariants = JSON.parse(row.backgroundVariants);
  } catch {
    backgroundVariants = [];
  }
  return { ...row, isUnlocked: !!row.isUnlocked, backgroundVariants };
}

export const environmentsRepository = {
  listAll(): Environment[] {
    const rows = db.getAllSync<EnvironmentRow>('SELECT * FROM environments ORDER BY category, rarity, name;');
    return rows.map(rowToEnvironment);
  },

  listByCategory(category: Category): Environment[] {
    const rows = db.getAllSync<EnvironmentRow>(
      'SELECT * FROM environments WHERE category = ? ORDER BY rarity, name;',
      category
    );
    return rows.map(rowToEnvironment);
  },

  getById(id: string): Environment | null {
    const row = db.getFirstSync<EnvironmentRow>('SELECT * FROM environments WHERE id = ?;', id);
    return row ? rowToEnvironment(row) : null;
  },

  /** Returns the first unlocked environment for a category (used as a new group's default). */
  getDefaultUnlockedForCategory(category: Category): Environment | null {
    const row = db.getFirstSync<EnvironmentRow>(
      'SELECT * FROM environments WHERE category = ? AND isUnlocked = 1 ORDER BY rarity, name LIMIT 1;',
      category
    );
    return row ? rowToEnvironment(row) : null;
  },

  /** Marks an environment unlocked (no-op if already unlocked). Returns whether this was a new unlock. */
  unlock(id: string): boolean {
    const existing = environmentsRepository.getById(id);
    if (!existing) throw new Error(`Environment ${id} not found`);
    if (existing.isUnlocked) return false;
    db.runSync('UPDATE environments SET isUnlocked = 1, unlockedAt = ? WHERE id = ?;', Date.now(), id);
    return true;
  },
};
