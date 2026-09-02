import { db, markDatabaseInitialized } from './client';
import { CREATE_TABLES_SQL } from './schema';

/**
 * Idempotent startup routine: creates tables if missing (current shape),
 * then migrates any pre-existing tables forward to that shape.
 */
export function initDatabase(): void {
  db.execSync(CREATE_TABLES_SQL);
  migrateGroupsToColumnCountIfNeeded();
  migrateGroupsToRowsColumnsIfNeeded();
  migrateGroupsRemoveActiveEnvironmentIfNeeded();
  markDatabaseInitialized();
}

/**
 * Migrates `item_groups` rows created under the old fixed
 * `gridRows`/`gridCols` model (schema v1) to the new dynamic-row model
 * (schema v2), which only stores the immutable `columnCount`.
 *
 * `CREATE TABLE IF NOT EXISTS` above is a no-op for a database that already
 * has an `item_groups` table from schema v1, so that old table (with its
 * NOT NULL `gridRows`/`gridCols` columns) is still exactly what's on disk
 * at this point for upgrading users. We rebuild the table with the new
 * shape, carrying `gridCols` over into `columnCount`, and copy every row
 * across unchanged otherwise. `items` rows (and their slotRow/slotCol
 * placements) are never touched — only `item_groups` is rebuilt, and
 * foreign keys are matched back up by `id` once it's renamed back into
 * place, so no item placement is lost or moved by this migration.
 *
 * NOTE: this intermediate shape still carries `activeEnvironmentId
 * REFERENCES environments(id)`, matching exactly what was on disk at this
 * historical schema version (an `environments` table genuinely existed
 * then, for any install old enough to need this step) —
 * `migrateGroupsRemoveActiveEnvironmentIfNeeded` below drops that column
 * (and the now-fully-unused `environments`/`gacha_pulls` tables) in a
 * later step, once it's safe to.
 */
function migrateGroupsToColumnCountIfNeeded(): void {
  const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(item_groups);');
  const hasLegacyGridColumns = columns.some((c) => c.name === 'gridRows' || c.name === 'gridCols');
  // This migration's only job is converting AWAY FROM `gridRows`/`gridCols`
  // (schema v1) — if they're not there, there's nothing for it to do,
  // regardless of what shape the table is *currently* in. Checking for the
  // presence of `columnCount` instead (as this used to) breaks on a fresh
  // schema-v5 install: that table has neither `gridRows`/`gridCols` NOR
  // `columnCount` (it's created with `rows`/`columns` directly, skipping
  // the `columnCount` shape entirely, see CREATE_TABLES_SQL) — this
  // function would then wrongly fall through into the v1->v2 rebuild below
  // and crash on `activeEnvironmentId`, a column schema v5 never has.
  if (!hasLegacyGridColumns) return; // fresh install or already migrated

  db.execSync('PRAGMA foreign_keys = OFF;');
  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE item_groups_v2 (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
        columnCount INTEGER NOT NULL,
        activeEnvironmentId TEXT,
        createdAt INTEGER NOT NULL
      );
    `);
    const columnCountSource = 'COALESCE(gridCols, 4)';
    db.execSync(`
      INSERT INTO item_groups_v2 (id, name, description, category, columnCount, activeEnvironmentId, createdAt)
      SELECT id, name, description, category, ${columnCountSource}, activeEnvironmentId, createdAt FROM item_groups;
    `);
    db.execSync('DROP TABLE item_groups;');
    db.execSync('ALTER TABLE item_groups_v2 RENAME TO item_groups;');
  });
  db.execSync('PRAGMA foreign_keys = ON;');
}

/**
 * Migrates `item_groups` from schema v2's single immutable `columnCount`
 * (with a dynamically-derived, unbounded row count — see the now-deleted
 * `features/shelf/shelfLayout.ts`) to schema v3's fixed `rows` + `columns`,
 * both stored and both resizable later via the explicit "Resize Layout"
 * flow.
 *
 * The tricky part is choosing a starting `rows` value for a group that
 * never had one stored before. We rebuild the table with a `rows = 1`
 * placeholder first, then backfill each group's real `rows` from whatever
 * row count it was already effectively displaying under the old dynamic
 * formula (re-implemented locally in `computeLegacyRowCount`, since the
 * feature module that used to own that logic no longer exists) — so
 * upgrading a device doesn't visually shrink/reflow anyone's existing shelf
 * out from under them. Groups created after this migration get `rows` from
 * the creation form instead (see `groupsRepository.create`).
 */
function migrateGroupsToRowsColumnsIfNeeded(): void {
  const tableInfo = db.getAllSync<{ name: string }>('PRAGMA table_info(item_groups);');
  const hasColumnCount = tableInfo.some((c) => c.name === 'columnCount');
  const hasRows = tableInfo.some((c) => c.name === 'rows');
  const hasColumns = tableInfo.some((c) => c.name === 'columns');
  if (!hasColumnCount && hasRows && hasColumns) return; // fresh install or already migrated

  db.execSync('PRAGMA foreign_keys = OFF;');
  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE item_groups_v3 (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
        rows INTEGER NOT NULL,
        columns INTEGER NOT NULL,
        activeEnvironmentId TEXT,
        createdAt INTEGER NOT NULL
      );
    `);
    const columnsSource = hasColumnCount ? 'columnCount' : '4';
    db.execSync(`
      INSERT INTO item_groups_v3 (id, name, description, category, rows, columns, activeEnvironmentId, createdAt)
      SELECT id, name, description, category, 1, ${columnsSource}, activeEnvironmentId, createdAt FROM item_groups;
    `);
    db.execSync('DROP TABLE item_groups;');
    db.execSync('ALTER TABLE item_groups_v3 RENAME TO item_groups;');
  });
  db.execSync('PRAGMA foreign_keys = ON;');

  const groups = db.getAllSync<{ id: string; columns: number }>('SELECT id, columns FROM item_groups;');
  for (const g of groups) {
    const placed = db.getAllSync<{ slotRow: number }>(
      "SELECT slotRow FROM items WHERE groupId = ? AND status = 'owned' AND slotRow IS NOT NULL;",
      g.id
    );
    const rows = computeLegacyRowCount(g.columns, placed.map((r) => r.slotRow));
    db.runSync('UPDATE item_groups SET rows = ? WHERE id = ?;', rows, g.id);
  }
}

/** A frozen copy of the old dynamic-row formula, kept only so the v2->v3 migration above can preserve visual continuity. Not used anywhere else — new code should never grow/shrink a grid automatically. */
function computeLegacyRowCount(columnCount: number, occupiedSlotRows: number[]): number {
  let maxRow = -1;
  let occupiedInMaxRow = 0;
  for (const slotRow of occupiedSlotRows) {
    if (slotRow > maxRow) {
      maxRow = slotRow;
      occupiedInMaxRow = 1;
    } else if (slotRow === maxRow) {
      occupiedInMaxRow += 1;
    }
  }
  if (maxRow === -1) return 5; // empty group — nothing to preserve, use the new creation default
  const neededGrowthRow = occupiedInMaxRow >= columnCount;
  return Math.max(1, maxRow + (neededGrowthRow ? 2 : 1));
}

/**
 * Migrates `item_groups` from schema v3/v4 (which still carried
 * `activeEnvironmentId`, pointing at a row in a whole gacha-unlockable
 * `environments` catalog) to schema v5, which dropped that entire system —
 * see README "Backgrounds are fixed per category, not user-selectable".
 * A group's background is now derived purely from its `category` (see
 * `shared/utils/shelfBackground.ts`), so `activeEnvironmentId` has nothing
 * left to point at and is simply removed, along with the now-fully-unused
 * `environments` and `gacha_pulls` tables (dropped unconditionally — safe
 * even on a fresh install where they were never created in the first
 * place, since `DROP TABLE IF EXISTS` is a no-op then).
 */
function migrateGroupsRemoveActiveEnvironmentIfNeeded(): void {
  const tableInfo = db.getAllSync<{ name: string }>('PRAGMA table_info(item_groups);');
  const hasActiveEnvironmentId = tableInfo.some((c) => c.name === 'activeEnvironmentId');

  if (hasActiveEnvironmentId) {
    db.execSync('PRAGMA foreign_keys = OFF;');
    db.withTransactionSync(() => {
      db.execSync(`
        CREATE TABLE item_groups_v5 (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
          rows INTEGER NOT NULL,
          columns INTEGER NOT NULL,
          createdAt INTEGER NOT NULL
        );
      `);
      db.execSync(`
        INSERT INTO item_groups_v5 (id, name, description, category, rows, columns, createdAt)
        SELECT id, name, description, category, rows, columns, createdAt FROM item_groups;
      `);
      db.execSync('DROP TABLE item_groups;');
      db.execSync('ALTER TABLE item_groups_v5 RENAME TO item_groups;');
    });
    db.execSync('PRAGMA foreign_keys = ON;');
  }

  db.execSync('DROP TABLE IF EXISTS gacha_pulls;');
  db.execSync('DROP TABLE IF EXISTS environments;');
}
