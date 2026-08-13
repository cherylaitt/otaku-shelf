/**
 * Core domain types for Otaku Shelf.
 *
 * The category system is the backbone of the app: every Group, Environment,
 * and (indirectly, via its parent Group) Item belongs to exactly one of the
 * two categories below. See README.md for the full rationale.
 */

export type Category = 'paper' | 'figure';

export const CATEGORIES: Category[] = ['paper', 'figure'];

export const CATEGORY_LABELS: Record<Category, string> = {
  paper: 'Paper Goods',
  figure: 'Figure Goods',
};

export const CATEGORY_SUBTEXT: Record<Category, string> = {
  paper: 'Cards, postcards & posters displayed in card holders.',
  figure: 'Acrylic stands, dolls & figures displayed on shelves & drawers.',
};

/** Item type, partitioned by category. Never mix across categories. */
export type PaperItemType = 'card' | 'postcard' | 'poster' | 'other';
export type FigureItemType = 'acrylic-stand' | 'doll' | 'figure' | 'other';
export type ItemType = PaperItemType | FigureItemType;

export const ITEM_TYPES_BY_CATEGORY: Record<Category, ItemType[]> = {
  paper: ['card', 'postcard', 'poster', 'other'],
  figure: ['acrylic-stand', 'doll', 'figure', 'other'],
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  card: 'Card',
  postcard: 'Postcard',
  poster: 'Poster',
  'acrylic-stand': 'Acrylic Stand',
  doll: 'Doll',
  figure: 'Figure',
  other: 'Other',
};

export function isItemTypeValidForCategory(itemType: ItemType, category: Category): boolean {
  return (ITEM_TYPES_BY_CATEGORY[category] as string[]).includes(itemType);
}

/**
 * Grid size presets offered both at group creation and later in "Resize
 * Layout" — the same preset-picker pattern in both places, deliberately not
 * a free-form number input, so the grid always renders cleanly within a
 * fixed-aspect-ratio background image.
 */
export const GRID_ROW_PRESETS: { value: number; label: string }[] = [
  { value: 3, label: '3 rows' },
  { value: 4, label: '4 rows' },
  { value: 5, label: '5 rows' },
];

export const GRID_COLUMN_PRESETS: { value: number; label: string }[] = [
  { value: 3, label: '3 (Narrow)' },
  { value: 4, label: '4 (Medium)' },
  { value: 5, label: '5 (Wide)' },
  { value: 6, label: '6 (Extra Wide)' },
];

/** Suggested defaults for new groups — 5 rows per the product spec, 4 columns as a middle-of-the-road width. */
export const DEFAULT_GRID_ROWS = 5;
export const DEFAULT_GRID_COLUMNS = 4;

export interface Group {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  /**
   * Fixed grid dimensions, per group. Chosen at creation (via the preset
   * picker), changeable afterward only through the explicit "Resize
   * Layout" flow (`groupsRepository.resize` + `itemsRepository.reflowForGroup`)
   * — never grown or shrunk automatically just by adding/removing items.
   * See `shared/utils/gridLayout.ts` for how items are paginated/reflowed
   * against these dimensions.
   */
  rows: number;
  columns: number;
  activeEnvironmentId: string | null;
  createdAt: number;
}

export type DisplayKind = 'card-holder' | 'shelf' | 'drawer';

export const DISPLAY_KIND_LABELS: Record<DisplayKind, string> = {
  'card-holder': 'Card Holder',
  shelf: 'Shelf',
  drawer: 'Drawer',
};

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 28,
  epic: 10,
  legendary: 2,
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#8A8F9C',
  rare: '#3E8EDE',
  epic: '#A85CE0',
  legendary: '#E0A63E',
};

/**
 * One background asset for an Environment. Meaning depends on the parent
 * Environment's `category` — see `resolveShelfBackground` in
 * `shared/utils/shelfBackground.ts` for the authoritative behavior:
 *
 * - For a **figure** Environment (baked-in shelf art), this is ONE of
 *   several entries — one per row-count preset (`GRID_ROW_PRESETS`) — since
 *   a shelf's row count is a fixed, user-chosen grid dimension (see
 *   `Group.rows`) and the art itself is authored per preset: a 3-row shelf
 *   image has its shelf boards drawn in different, non-uniform positions
 *   than the 5-row version of the same shelf, rather than one image
 *   stretched across however many rows happen to be showing. `rows` and
 *   `shelfAnchorY` are both meaningful and hand-authored per image.
 * - For a **paper** Environment (a continuous texture with no physical
 *   shelves — a binder page, a con-booth backdrop, etc.), there is exactly
 *   ONE entry in `Environment.backgroundVariants`, used unconditionally
 *   regardless of the group's row count. Its `rows`/`shelfAnchorY` fields
 *   are unused placeholders — see `singleTexturePaperBackground` in
 *   `seedEnvironments.ts` — rows are always evenly divided by app code
 *   instead, exactly as they were before this variant system existed.
 */
export interface ShelfBackgroundVariant {
  /** Which row-count preset this asset + anchors were authored for. Meaningful for `figure` only — see the type doc above. */
  rows: number;
  imageUri: string;
  /**
   * Natural pixel dimensions of the source image (from
   * `Image.resolveAssetSource` for bundled assets). Needed to correctly map
   * `shelfAnchorY` — defined relative to the full image — onto a rendered
   * container whose aspect ratio differs, since `resizeMode="cover"` crops
   * whichever axis overflows.
   */
  imageWidth: number;
  imageHeight: number;
  /**
   * Normalized (0-1) Y position, relative to the full source image, of each
   * row's shelf TOP SURFACE — where a drawn shelf board sits. Index 0 is
   * the topmost row; must have exactly `rows` entries. These are NOT
   * evenly spaced by default in real art (e.g. the top compartment is
   * often shorter than the middle ones) — they must be measured by hand
   * from each generated image. Items are positioned with their BOTTOM edge
   * resting here, instead of dividing the available height evenly.
   * Meaningful for `figure` only — see the type doc above.
   */
  shelfAnchorY: number[];
}

export interface Environment {
  id: string;
  name: string;
  backgroundColor: string;
  category: Category;
  displayKind: DisplayKind;
  rarity: Rarity;
  isUnlocked: boolean;
  unlockedAt: number | null;
  /**
   * Background art. Empty array means no bundled art for this environment
   * at all — `backgroundColor` alone is shown, with rows evenly spaced.
   * Otherwise: for `figure`, per-row-count variants that get fully swapped
   * on resize; for `paper`, exactly one continuous-texture entry used
   * regardless of row count. See `ShelfBackgroundVariant` and
   * `resolveShelfBackground`.
   */
  backgroundVariants: ShelfBackgroundVariant[];
}

export type ItemStatus = 'owned' | 'wishlist' | 'sold' | 'on-order';

export const ITEM_STATUSES: ItemStatus[] = ['owned', 'wishlist', 'sold', 'on-order'];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  owned: 'Owned',
  wishlist: 'Wishlist',
  sold: 'Sold',
  'on-order': 'On Order',
};

export interface Item {
  id: string;
  groupId: string;
  itemType: ItemType;
  name: string;
  seriesFranchise: string | null;
  imageUri: string | null;
  purchaseAmount: number | null;
  purchaseDate: number | null;
  notes: string | null;
  tags: string[];
  status: ItemStatus;
  slotRow: number | null;
  slotCol: number | null;
  barcodeCode: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface GachaPullLog {
  id: string;
  timestamp: number;
  category: Category;
  resultEnvironmentId: string;
  wasNewUnlock: boolean;
}

/** Thrown by the data-access layer when a category-integrity rule is violated. */
export class CategoryMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryMismatchError';
  }
}
