/**
 * Core domain types for Otaku Shelf.
 *
 * The category system is the backbone of the app: every Group, and
 * (indirectly, via its parent Group) Item belongs to exactly one of the two
 * categories below — which also determines which of the two fixed shelf
 * backgrounds it gets (see `shared/config/shelfBackgrounds.ts`). See
 * README.md for the full rationale.
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
  createdAt: number;
}

/**
 * One baked-in shelf-art asset, keyed by row-count preset. Only meaningful
 * for **figure** groups — see `shared/config/shelfBackgrounds.ts` and
 * `resolveShelfBackground` in `shared/utils/shelfBackground.ts`.
 *
 * There is exactly one background per goods category now (no user-facing
 * style choice — see README "Backgrounds are fixed per category"), but a
 * **figure** background still ships one full variant PER supported
 * row-count preset (3/4/5 — see `GRID_ROW_PRESETS`), because resizing a
 * figure group's rows swaps the entire baked-in shelf-art asset (image +
 * anchors together) rather than stretching one picture — real shelf
 * photography/renders have uneven gaps (a shorter top compartment is
 * typical), so these are never evenly spaced by default.
 */
export interface ShelfBackgroundVariant {
  /** Which row-count preset this asset + anchors were authored for. */
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
   */
  shelfAnchorY: number[];
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

/** Thrown by the data-access layer when a category-integrity rule is violated. */
export class CategoryMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryMismatchError';
  }
}
