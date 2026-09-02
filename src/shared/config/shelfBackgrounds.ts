/**
 * Fixed, developer-controlled shelf backgrounds — ONE per goods category,
 * not user-selectable. There used to be a whole gacha-unlockable catalog of
 * `Environment` rows with rarity tiers; that entire system was cut (see
 * README "Backgrounds are fixed per category, not user-selectable") in
 * favor of exactly the two constants below. If a style choice ever comes
 * back, it should be a new, separate feature — don't resurrect the old
 * Environment/gacha tables for it.
 */
import { Image } from 'react-native';
import { Category, GRID_ROW_PRESETS, ShelfBackgroundVariant } from '../types/models';

/** One row-count preset's worth of baked-in shelf art — see `FIGURE_SHELF_VARIANTS`. */
interface FigureRowArt {
  /** `require('../../../assets/environments/....png')` for THIS row count's own image — a 3-row shelf and a 5-row shelf are expected to be genuinely different pieces of art, not the same image with different anchors. */
  image: number;
  /** Hand-measured, normalized (0-1) Y of each shelf's top surface in THIS image, top to bottom. Must have exactly as many entries as the preset's row count. */
  shelfAnchorY: number[];
}

/**
 * Builds one figure background's `ShelfBackgroundVariant[]`: one entry per
 * supported row-count preset (3/4/5 — see `GRID_ROW_PRESETS`), each from
 * its OWN image + its own hand-measured `shelfAnchorY`. Real shelf art has
 * uneven gaps (the top compartment is often shorter than the middle ones),
 * so these must never be generated with even spacing. `artByRows` requires
 * one entry per preset, and each entry's anchor count is checked against
 * that preset's row count at module load, to catch a missing/mismeasured
 * entry immediately rather than silently falling back to something wrong.
 */
function figureShelfVariants(artByRows: Record<number, FigureRowArt>): ShelfBackgroundVariant[] {
  return GRID_ROW_PRESETS.map((preset) => {
    const art = artByRows[preset.value];
    if (!art) {
      throw new Error(`figureShelfVariants: missing art for ${preset.value} rows`);
    }
    if (art.shelfAnchorY.length !== preset.value) {
      throw new Error(
        `figureShelfVariants: shelfAnchorY has ${art.shelfAnchorY.length} entries, expected ${preset.value} for ${preset.value} rows`
      );
    }
    const resolved = Image.resolveAssetSource(art.image);
    return { rows: preset.value, imageUri: resolved.uri, imageWidth: resolved.width, imageHeight: resolved.height, shelfAnchorY: art.shelfAnchorY };
  });
}

/**
 * Builds the single continuous-texture variant for the paper background (a
 * binder page, a con-booth backdrop, ...) — used as-is regardless of the
 * group's row count, since there's no physical shelf in this art to line
 * rows up against (rows are always evenly divided by app code instead, see
 * `resolveShelfBackground`). `rows`/`shelfAnchorY` on this entry are unused
 * placeholders, kept only so paper and figure share the same storage shape.
 */
function singleTexturePaperBackground(imageModule: number): ShelfBackgroundVariant {
  const resolved = Image.resolveAssetSource(imageModule);
  return { rows: 0, imageUri: resolved.uri, imageWidth: resolved.width, imageHeight: resolved.height, shelfAnchorY: [] };
}

// Measured from each image's actual pixels (a brightness-peak scan down
// the interior column, isolating each shelf board's lit top edge from the
// darker interior shadow behind it) rather than guessed — see the
// analysis notes in the PR/chat history if these ever need re-deriving
// after an art update. The LAST value in each array is the cabinet's
// floor (where the base trim begins), which is the bottom row's actual
// resting surface, not a shelf board — every array intentionally has one
// fewer literal "board" than it has rows for exactly this reason.
export const FIGURE_SHELF_VARIANTS: ShelfBackgroundVariant[] = figureShelfVariants({
  3: { image: require('../../../assets/environments/classic-shelf-3rows.png'), shelfAnchorY: [0.37, 0.645, 0.9] },
  4: { image: require('../../../assets/environments/classic-shelf-4rows.png'), shelfAnchorY: [0.293, 0.515, 0.715, 0.919] },
  5: { image: require('../../../assets/environments/classic-shelf.png'), shelfAnchorY: [0.241, 0.425, 0.601, 0.769, 0.937] },
});

export const PAPER_TEXTURE: ShelfBackgroundVariant = singleTexturePaperBackground(
  require('../../../assets/environments/paper-binder.png')
);

/** Solid-color fallback/letterbox color shown behind the image (or alone, if art is ever removed). */
export const BACKGROUND_COLOR_BY_CATEGORY: Record<Category, string> = {
  paper: '#E8E1D3',
  figure: '#5C4530',
};
