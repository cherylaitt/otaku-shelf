/**
 * SQLite schema definition. Applied idempotently on every launch via
 * `CREATE TABLE IF NOT EXISTS`. Bump SCHEMA_VERSION + add a migration step
 * in `migrate.ts` if columns need to change later.
 */
export const SCHEMA_VERSION = 5;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- rows/columns is a fixed grid size, chosen at creation and changeable only
-- via the explicit "Resize Layout" flow (groupsRepository.resize) — unlike
-- schema v2, there is no dynamic auto-grow/shrink; item placements are
-- reflowed into these dimensions by itemsRepository.reflowForGroup whenever
-- they change (see shared/utils/gridLayout.ts).
--
-- There is no activeEnvironmentId / environments table (schema v5 removed
-- the gacha/rarity/background-catalog system entirely) - a group's
-- background is now derived purely from its category, via the two fixed
-- backgrounds in shared/config/shelfBackgrounds.ts.
CREATE TABLE IF NOT EXISTS item_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
  rows INTEGER NOT NULL,
  columns INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  groupId TEXT NOT NULL REFERENCES item_groups(id) ON DELETE CASCADE,
  itemType TEXT NOT NULL,
  name TEXT NOT NULL,
  seriesFranchise TEXT,
  imageUri TEXT,
  purchaseAmount REAL,
  purchaseDate INTEGER,
  notes TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('owned', 'wishlist', 'sold', 'on-order')),
  slotRow INTEGER,
  slotCol INTEGER,
  barcodeCode TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_groupId ON items(groupId);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
`;
