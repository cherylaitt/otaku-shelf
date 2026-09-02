import * as SQLite from 'expo-sqlite';

/**
 * Single shared SQLite connection for the whole app.
 *
 * We use the synchronous API (execSync/runSync/getAllSync/getFirstSync)
 * throughout the data-access layer. Collection sizes for a personal goods
 * tracker are small (hundreds, not millions of rows), so blocking the JS
 * thread briefly for a query is an acceptable, much simpler trade-off than
 * threading async/await through every store action.
 */
export const db = SQLite.openDatabaseSync('otaku-shelf.db');

let initialized = false;

export function isDatabaseInitialized(): boolean {
  return initialized;
}

export function markDatabaseInitialized(): void {
  initialized = true;
}

/** Wipes all app data. Used by Settings > Reset. Keeps the schema intact. */
export function resetAllData(): void {
  db.withTransactionSync(() => {
    db.execSync('DELETE FROM items;');
    db.execSync('DELETE FROM item_groups;');
  });
}
