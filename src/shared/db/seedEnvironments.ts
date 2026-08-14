import { Image } from 'react-native';
import { Environment, GRID_ROW_PRESETS, ShelfBackgroundVariant } from '../types/models';

/** One row-count preset's worth of baked-in shelf art — see `figureShelfVariants`. */
interface FigureRowArt {
  /** `require('../../../assets/environments/....png')` for THIS row count's own image — a 3-row shelf and a 5-row shelf are expected to be genuinely different pieces of art, not the same image with different anchors. */
  image: number;
  /** Hand-measured, normalized (0-1) Y of each shelf's top surface in THIS image, top to bottom. Must have exactly as many entries as the preset's row count. */
  shelfAnchorY: number[];
}

/**
 * Builds the `backgroundVariants` for a **figure** Environment with baked-in
 * shelf art: one `ShelfBackgroundVariant` per supported row-count preset
 * (3/4/5 — see `GRID_ROW_PRESETS`), each from its OWN image + its own
 * hand-measured `shelfAnchorY`. Real shelf art has uneven gaps (the top
 * compartment is often shorter than the middle ones), so these must never
 * be generated with even spacing. `artByRows` requires one entry per
 * preset, and each entry's anchor count is checked against that preset's
 * row count at seed time, to catch a missing/mismeasured entry immediately
 * rather than silently falling back to something wrong.
 */
function figureShelfVariants(artByRows: Record<number, FigureRowArt>): ShelfBackgroundVariant[] {
  return GRID_ROW_PRESETS.map((preset) => {
    const art = artByRows[preset.value];
    if (!art) {
      throw new Error(`figureShelfVariants: missing art for ${preset.value} rows`);
    }
    if (art.shelfAnchorY.length !== preset.value) {
      throw new Error(`figureShelfVariants: shelfAnchorY has ${art.shelfAnchorY.length} entries, expected ${preset.value} for ${preset.value} rows`);
    }
    const resolved = Image.resolveAssetSource(art.image);
    return { rows: preset.value, imageUri: resolved.uri, imageWidth: resolved.width, imageHeight: resolved.height, shelfAnchorY: art.shelfAnchorY };
  });
}

/**
 * Builds the `backgroundVariants` for a **paper** Environment: a single
 * continuous texture (a binder page, a con-booth backdrop, ...) used
 * unconditionally regardless of the group's row count — there's no
 * physical shelf in this art to line up rows against, so rows are always
 * evenly divided by app code instead (see `resolveShelfBackground`). The
 * `rows`/`shelfAnchorY` on this single entry are unused placeholders, kept
 * only so paper and figure environments can share the same storage shape.
 */
function singleTexturePaperBackground(imageModule: number): ShelfBackgroundVariant[] {
  const resolved = Image.resolveAssetSource(imageModule);
  return [{ rows: 0, imageUri: resolved.uri, imageWidth: resolved.width, imageHeight: resolved.height, shelfAnchorY: [] }];
}

const PAPER_BINDER_VARIANTS = singleTexturePaperBackground(require('../../../assets/environments/paper-binder.png'));
const GREEN_PAPER_VARIANTS = singleTexturePaperBackground(require('../../../assets/environments/green-paper.png'));
const LAVENDER_PAPER_VARIANTS = singleTexturePaperBackground(require('../../../assets/environments/lavender-paper.png'));

// Measured from each image's actual pixels (a brightness-peak scan down
// the interior column, isolating each shelf board's lit top edge from the
// darker interior shadow behind it) rather than guessed — see the
// analysis notes in the PR/chat history if these ever need re-deriving
// after an art update. The LAST value in each array is the cabinet's
// floor (where the base trim begins), which is the bottom row's actual
// resting surface, not a shelf board — every array intentionally has one
// fewer literal "board" than it has rows for exactly this reason.
const CLASSIC_SHELF_VARIANTS = figureShelfVariants({
  3: { image: require('../../../assets/environments/classic-shelf-3rows.png'), shelfAnchorY: [0.37, 0.645, 0.9] },
  4: { image: require('../../../assets/environments/classic-shelf-4rows.png'), shelfAnchorY: [0.293, 0.515, 0.715, 0.919] },
  5: { image: require('../../../assets/environments/classic-shelf.png'), shelfAnchorY: [0.241, 0.425, 0.601, 0.769, 0.937] },
});

/**
 * Starter catalog seeded on first launch. Most entries use solid-color
 * placeholder backgrounds (no bundled art needed) — `backgroundVariants` is
 * left as `[]` as a signal to the UI to render `backgroundColor` instead,
 * with rows evenly spaced. Swap in real art later by giving an entry a
 * non-empty `backgroundVariants` — via `figureShelfVariants` (figure goods:
 * per-row-count art + hand-measured shelf anchors) or
 * `singleTexturePaperBackground` (paper goods: one texture, no anchors).
 * The Shelf View already prefers real art over the solid color when
 * present. `backgroundColor` is kept even once real art exists, since
 * other screens (Group List thumbnail, Skin Locker swatch, Gacha reveal
 * card) show it as a small solid swatch rather than the full image.
 *
 * IMPORTANT: an entry's `id` is permanent once shipped — `migrate.ts`'s
 * startup sync matches rows by `id`, so editing `name`/`backgroundVariants`/
 * etc. in place always reaches every install. Changing the `id` instead
 * makes the sync treat it as "old one retired, new one added": on installs
 * where the old id was never gacha-pulled or equipped it just vanishes
 * silently, and on installs where it was, the old row is deliberately kept
 * (to avoid losing pull history / a dangling FK) and sits there forever
 * under its stale name — invisible to anyone editing this file, since it
 * lives in `migrate.ts` (see `LEGACY_ENVIRONMENT_ID_REMAP`) not here. If an
 * id genuinely must change, add a remap entry there in the same change.
 */
export const STARTER_ENVIRONMENTS: Omit<Environment, 'unlockedAt'>[] = [
  // --- Paper (card-holder) ---
  {
    id: 'env-paper-binder',
    name: 'Classic Binder Page',
    backgroundVariants: PAPER_BINDER_VARIANTS,
    backgroundColor: '#E8E1D3',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'common',
    isUnlocked: true,
  },
  {
    id: 'env-paper-green',
    name: 'Green Binder Page',
    backgroundVariants: GREEN_PAPER_VARIANTS,
    backgroundColor: '#4A2C3D',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'common',
    isUnlocked: false,
  },
  {
    id: 'env-paper-lavender',
    name: 'Lavender Binder Page',
    backgroundVariants: LAVENDER_PAPER_VARIANTS,
    backgroundColor: '#CFE8EA',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'common',
    isUnlocked: false,
  },
  {
    id: 'env-paper-neon-booth',
    name: 'Neon Con Booth',
    backgroundVariants: [],
    backgroundColor: '#2B1B4A',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'rare',
    isUnlocked: false,
  },
  {
    id: 'env-paper-holo',
    name: 'Holo Foil Frame',
    backgroundVariants: [],
    backgroundColor: '#C9A6E0',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'epic',
    isUnlocked: false,
  },
  {
    id: 'env-paper-gallery',
    name: 'Midnight Gallery Wall',
    backgroundVariants: [],
    backgroundColor: '#1C1F2E',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'epic',
    isUnlocked: false,
  },
  {
    id: 'env-paper-vault',
    name: 'Golden Vault Display',
    backgroundVariants: [],
    backgroundColor: '#7A5A26',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'legendary',
    isUnlocked: false,
  },
  {
    id: 'env-paper-starlight',
    name: 'Starlight Shrine',
    backgroundVariants: [],
    backgroundColor: '#1A2350',
    category: 'paper',
    displayKind: 'card-holder',
    rarity: 'legendary',
    isUnlocked: false,
  },

  // --- Figure (shelf / drawer) ---
  {
    id: 'env-figure-classic-shelf',
    name: 'Classic Shelf',
    backgroundVariants: CLASSIC_SHELF_VARIANTS,
    backgroundColor: '#5C4530',
    category: 'figure',
    displayKind: 'shelf',
    rarity: 'common',
    isUnlocked: true,
  },
  {
    id: 'env-figure-glass',
    name: 'Glass Display Cabinet',
    backgroundVariants: [],
    backgroundColor: '#DCE6E8',
    category: 'figure',
    displayKind: 'shelf',
    rarity: 'common',
    isUnlocked: false,
  },
  {
    id: 'env-figure-arcade',
    name: 'Neon Arcade Shelf',
    backgroundVariants: [],
    backgroundColor: '#241B3A',
    category: 'figure',
    displayKind: 'shelf',
    rarity: 'rare',
    isUnlocked: false,
  },
  {
    id: 'env-figure-bedroom',
    name: 'Bedroom Corner Drawer',
    backgroundVariants: [],
    backgroundColor: '#D8B8A0',
    category: 'figure',
    displayKind: 'drawer',
    rarity: 'rare',
    isUnlocked: false,
  },
  {
    id: 'env-figure-museum',
    name: 'Museum Pedestal Row',
    backgroundVariants: [],
    backgroundColor: '#3A3630',
    category: 'figure',
    displayKind: 'shelf',
    rarity: 'epic',
    isUnlocked: false,
  },
  {
    id: 'env-figure-blossom',
    name: 'Cherry Blossom Alcove',
    backgroundVariants: [],
    backgroundColor: '#E8B9C4',
    category: 'figure',
    displayKind: 'drawer',
    rarity: 'epic',
    isUnlocked: false,
  },
  {
    id: 'env-figure-crystal',
    name: 'Crystal Throne Case',
    backgroundVariants: [],
    backgroundColor: '#2E5A5E',
    category: 'figure',
    displayKind: 'shelf',
    rarity: 'legendary',
    isUnlocked: false,
  },
  {
    id: 'env-figure-celestial',
    name: 'Celestial Vault',
    backgroundVariants: [],
    backgroundColor: '#1A1440',
    category: 'figure',
    displayKind: 'drawer',
    rarity: 'legendary',
    isUnlocked: false,
  },
];
