import { db } from '../client';
import { generateId } from '../../utils/id';
import { Category, GachaPullLog } from '../../types/models';

interface GachaPullRow {
  id: string;
  timestamp: number;
  category: Category;
  resultEnvironmentId: string;
  wasNewUnlock: number;
}

function rowToLog(row: GachaPullRow): GachaPullLog {
  return { ...row, wasNewUnlock: !!row.wasNewUnlock };
}

export const gachaRepository = {
  log(entry: Omit<GachaPullLog, 'id'>): GachaPullLog {
    const record: GachaPullLog = { ...entry, id: generateId() };
    db.runSync(
      'INSERT INTO gacha_pulls (id, timestamp, category, resultEnvironmentId, wasNewUnlock) VALUES (?, ?, ?, ?, ?);',
      record.id,
      record.timestamp,
      record.category,
      record.resultEnvironmentId,
      record.wasNewUnlock ? 1 : 0
    );
    return record;
  },

  listByCategory(category: Category, limit = 20): GachaPullLog[] {
    const rows = db.getAllSync<GachaPullRow>(
      'SELECT * FROM gacha_pulls WHERE category = ? ORDER BY timestamp DESC LIMIT ?;',
      category,
      limit
    );
    return rows.map(rowToLog);
  },
};
