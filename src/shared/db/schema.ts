/**
 * SQLite schema definition. Applied idempotently on every launch via
 * `CREATE TABLE IF NOT EXISTS`. Bump SCHEMA_VERSION + add a migration step
 * in `migrate.ts` if columns need to change later.
 */
export const SCHEMA_VERSION = 4;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- backgroundVariants is a JSON-encoded ShelfBackgroundVariant[] (see
-- shared/types/models.ts) — one background asset + shelf-line anchors per
-- supported row-count preset, swapped in full when a group's row count
-- changes. Fully developer-controlled catalog content (like the rest of
-- this row, isUnlocked/unlockedAt aside), synced from STARTER_ENVIRONMENTS
-- on every launch — see syncStarterEnvironmentsIfNeeded in migrate.ts.
CREATE TABLE IF NOT EXISTS environments (
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

-- rows/columns is a fixed grid size, chosen at creation and changeable only
-- via the explicit "Resize Layout" flow (groupsRepository.resize) — unlike
-- schema v2, there is no dynamic auto-grow/shrink; item placements are
-- reflowed into these dimensions by itemsRepository.reflowForGroup whenever
-- they change (see shared/utils/gridLayout.ts).
CREATE TABLE IF NOT EXISTS item_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
  rows INTEGER NOT NULL,
  columns INTEGER NOT NULL,
  activeEnvironmentId TEXT REFERENCES environments(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS gacha_pulls (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('paper', 'figure')),
  resultEnvironmentId TEXT NOT NULL REFERENCES environments(id),
  wasNewUnlock INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gacha_category ON gacha_pulls(category);
`;
