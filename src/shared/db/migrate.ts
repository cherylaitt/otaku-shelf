import { db, markDatabaseInitialized } from './client';
import { CREATE_TABLES_SQL } from './schema';
import { STARTER_ENVIRONMENTS } from './seedEnvironments';

/**
 * Idempotent startup routine: creates tables if missing, migrates any
 * pre-existing tables to the current schema, then seeds the starter
 * Environment catalog only if the table is empty (so we never clobber a
 * returning user's unlock progress).
 */
export function initDatabase(): void {
  db.execSync(CREATE_TABLES_SQL);
  migrateGroupsToColumnCountIfNeeded();
  migrateGroupsToRowsColumnsIfNeeded();
  migrateEnvironmentsToBackgroundVariantsIfNeeded();
  syncStarterEnvironmentsIfNeeded();
  remapLegacyEnvironmentIdsIfNeeded();
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
 */
function migrateGroupsToColumnCountIfNeeded(): void {
  const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(item_groups);');
  const hasLegacyGridColumns = columns.some((c) => c.name === 'gridRows' || c.name === 'gridCols');
  const hasColumnCount = columns.some((c) => c.name === 'columnCount');
  if (!hasLegacyGridColumns && hasColumnCount) return; // fresh install or already migrated

  db.execSync('PRAGMA foreign_keys = OFF;');
  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE item_groups_v2 (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
        columnCount INTEGER NOT NULL,
        activeEnvironmentId TEXT REFERENCES environments(id) ON DELETE SET NULL,
        createdAt INTEGER NOT NULL
      );
    `);
    const columnCountSource = hasLegacyGridColumns ? 'COALESCE(gridCols, 4)' : '4';
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
        activeEnvironmentId TEXT REFERENCES environments(id) ON DELETE SET NULL,
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
 * Migrates `environments` from schema v3's single `backgroundImageUri`
 * (one image, stretched/covered across however many rows a group happened
 * to have) to schema v4's `backgroundVariants` — a JSON-encoded array of
 * per-row-count assets + shelf-line anchors (see `ShelfBackgroundVariant`).
 *
 * There's no meaningful way to carry an old single image forward into the
 * new per-row-count-variant shape (it wasn't authored with row-count-
 * specific shelf lines at all), so this just makes room for the new column
 * with an empty `'[]'` placeholder — `syncStarterEnvironmentsIfNeeded`,
 * which runs immediately after, unconditionally overwrites
 * `backgroundVariants` for every catalog id from the current
 * STARTER_ENVIRONMENTS source anyway (this column is fully
 * developer-controlled catalog content, never user data), so the
 * placeholder never stays empty in practice.
 */
function migrateEnvironmentsToBackgroundVariantsIfNeeded(): void {
  const tableInfo = db.getAllSync<{ name: string }>('PRAGMA table_info(environments);');
  const hasBackgroundImageUri = tableInfo.some((c) => c.name === 'backgroundImageUri');
  const hasBackgroundVariants = tableInfo.some((c) => c.name === 'backgroundVariants');
  if (!hasBackgroundImageUri && hasBackgroundVariants) return; // fresh install or already migrated

  db.execSync('PRAGMA foreign_keys = OFF;');
  db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE environments_v4 (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        backgroundColor TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
        displayKind TEXT NOT NULL CHECK (displayKind IN ('card-holder', 'shelf', 'drawer')),
        rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
        isUnlocked INTEGER NOT NULL DEFAULT 0,
        unlockedAt INTEGER,
        backgroundVariants TEXT NOT NULL DEFAULT '[]'
      );
    `);
    db.execSync(`
      INSERT INTO environments_v4 (id, name, backgroundColor, category, displayKind, rarity, isUnlocked, unlockedAt, backgroundVariants)
      SELECT id, name, backgroundColor, category, displayKind, rarity, isUnlocked, unlockedAt, '[]' FROM environments;
    `);
    db.execSync('DROP TABLE environments;');
    db.execSync('ALTER TABLE environments_v4 RENAME TO environments;');
  });
  db.execSync('PRAGMA foreign_keys = ON;');
}

/**
 * Reconciles the `environments` table with the current STARTER_ENVIRONMENTS
 * source on every launch — this both seeds a fresh install AND keeps an
 * already-seeded install in sync as the catalog changes over time.
 *
 * Unlike the rest of an Environment row (isUnlocked, unlockedAt — genuine
 * user progress, never touched here), everything else about a starter
 * Environment is fully developer-controlled catalog content the user has
 * no UI to edit, so an UPSERT is safe:
 *
 * - An id not yet in the DB (fresh install, or a brand-new catalog entry
 *   like swapping "Acrylic Display Case" for "Lavender Card Sleeve" under
 *   a new id) gets INSERTed with the catalog's own isUnlocked default.
 * - An id already in the DB gets its name/art/category/displayKind/rarity
 *   synced to match the source, leaving isUnlocked/unlockedAt alone. A
 *   plain `UPDATE ... WHERE id = ?` (the previous approach here) can only
 *   ever touch rows that already exist — it silently does nothing for a
 *   new id, which is exactly why a renamed/added entry could sit unseen on
 *   an already-seeded install. INSERT ... ON CONFLICT DO UPDATE covers both
 *   cases in one statement.
 * - An id that's no longer in the source list (fully retired, not just
 *   renamed) is deleted — unless gacha history still references it via
 *   `gacha_pulls.resultEnvironmentId` (which has no ON DELETE clause), in
 *   which case it's left in place rather than risk breaking that history
 *   or throwing a foreign-key error.
 */
function syncStarterEnvironmentsIfNeeded(): void {
  db.withTransactionSync(() => {
    for (const env of STARTER_ENVIRONMENTS) {
      db.runSync(
        `INSERT INTO environments (id, name, backgroundColor, category, displayKind, rarity, isUnlocked, unlockedAt, backgroundVariants)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           backgroundColor = excluded.backgroundColor,
           category = excluded.category,
           displayKind = excluded.displayKind,
           rarity = excluded.rarity,
           backgroundVariants = excluded.backgroundVariants;`,
        env.id,
        env.name,
        env.backgroundColor,
        env.category,
        env.displayKind,
        env.rarity,
        env.isUnlocked ? 1 : 0,
        env.isUnlocked ? Date.now() : null,
        JSON.stringify(env.backgroundVariants)
      );
    }

    const currentIds = STARTER_ENVIRONMENTS.map((e) => e.id);
    const placeholders = currentIds.map(() => '?').join(',');
    const stale = db.getAllSync<{ id: string }>(
      `SELECT id FROM environments WHERE id NOT IN (${placeholders});`,
      ...currentIds
    );
    for (const { id } of stale) {
      const referenced = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM gacha_pulls WHERE resultEnvironmentId = ?;',
        id
      );
      if (referenced && referenced.count > 0) continue; // keep retired-but-historically-referenced rows
      db.runSync('DELETE FROM environments WHERE id = ?;', id);
    }
  });
}

/**
 * A STARTER_ENVIRONMENTS `id` must be treated as permanent once shipped —
 * `syncStarterEnvironmentsIfNeeded` above keys everything off of `id`, so
 * changing a catalog entry's `id` (instead of just its `name`/art in place)
 * makes it look, from the sync's point of view, like the old id was retired
 * and a brand-new environment was added. If that old id is only sitting in
 * the catalog unused, `syncStarterEnvironmentsIfNeeded` quietly deletes it
 * and the rename is invisible. But if it was ever gacha-pulled or is equipped
 * on a shelf, the safe-delete check above deliberately keeps the row (to
 * avoid a dangling FK / losing pull history) — which means it lingers
 * forever under its last-synced name, while a separate, correctly-named row
 * exists under the new id. That's exactly what happened here: an id that
 * used to back "Green Card Sleeve" was renamed to `env-paper-green`
 * ("Green Binder Page") in the source, but the old id was still equipped on
 * a real shelf, so its row survived untouched — the rename never reached the
 * one place the user was actually looking.
 *
 * This table is the fix for that class of bug after the fact: map every
 * retired id that might still be referenced to whatever id replaced it, and
 * this function repoints those references, carries the old row's unlock
 * progress forward, and drops the now-unreferenced old row, on every launch.
 * It runs after `syncStarterEnvironmentsIfNeeded` so the replacement id's row
 * is guaranteed to already exist before anything is repointed at it
 * (`gacha_pulls.resultEnvironmentId` has a real FK constraint, so pointing it
 * at a not-yet-inserted id would throw).
 *
 * Going forward: never change an existing STARTER_ENVIRONMENTS entry's `id`.
 * If an id genuinely must be replaced, add an entry here instead.
 */
const LEGACY_ENVIRONMENT_ID_REMAP: Record<string, string> = {
  'env-paper-velvet': 'env-paper-green',
};

function remapLegacyEnvironmentIdsIfNeeded(): void {
  db.withTransactionSync(() => {
    for (const [oldId, newId] of Object.entries(LEGACY_ENVIRONMENT_ID_REMAP)) {
      const old = db.getFirstSync<{ id: string; isUnlocked: number; unlockedAt: number | null }>(
        'SELECT id, isUnlocked, unlockedAt FROM environments WHERE id = ?;',
        oldId
      );
      if (!old) continue; // already cleaned up on a previous launch

      // The old row's `isUnlocked`/`unlockedAt` is real user progress (it was
      // gacha-pulled) that syncStarterEnvironmentsIfNeeded's INSERT above had
      // no way to know about — the new id looked brand-new to it, so it got
      // seeded with the catalog's default (locked). Carry the old row's
      // unlock status forward — but only to unlock, never to re-lock — so an
      // id rename can never look like it revoked something the user earned.
      if (old.isUnlocked) {
        db.runSync(
          'UPDATE environments SET isUnlocked = 1, unlockedAt = COALESCE(unlockedAt, ?) WHERE id = ? AND isUnlocked = 0;',
          old.unlockedAt ?? Date.now(),
          newId
        );
      }

      db.runSync('UPDATE gacha_pulls SET resultEnvironmentId = ? WHERE resultEnvironmentId = ?;', newId, oldId);
      db.runSync('UPDATE item_groups SET activeEnvironmentId = ? WHERE activeEnvironmentId = ?;', newId, oldId);
      db.runSync('DELETE FROM environments WHERE id = ?;', oldId);
    }
  });
}
