import { Category } from '../types/models';
import { FIGURE_SHELF_VARIANTS, PAPER_TEXTURE } from '../config/shelfBackgrounds';

/** Default anchors for a row count with no authored `shelfAnchorY` data — mathematically identical to the old even-grid-division behavior. */
export function evenRowAnchors(rows: number): number[] {
  return Array.from({ length: rows }, (_, i) => (i + 1) / rows);
}

export interface ResolvedShelfBackground {
  imageUri: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  /** Normalized (0-1) bottom-edge Y for each row, relative to the full source image (or evenly spaced if there's no matching variant/no image). Always has exactly `rows` entries. */
  anchorsY: number[];
}

/**
 * Picks the fixed background asset for a group's shelf, given its category
 * and current row count. There is exactly one background per category (see
 * `shared/config/shelfBackgrounds.ts` — no user-facing style choice), but
 * behavior still differs per category, mirroring how differently the art
 * is authored:
 *
 * - **figure**: baked-in shelf art with real, unevenly-spaced shelf boards
 *   drawn into the image — one full asset PER row-count preset (see
 *   `ShelfBackgroundVariant`). This resolves the variant whose `rows`
 *   exactly matches the group's current row count, swapping the FULL asset
 *   (image + its own `shelfAnchorY`) whenever a resize changes that row
 *   count. If no variant matches, falls back to evenly-spaced rows with no
 *   image, rather than ever showing art whose baked-in shelf lines don't
 *   match the row count.
 * - **paper**: one continuous texture regardless of row count (a binder-
 *   page pattern, a con-booth backdrop, etc. — there's no physical "shelf"
 *   in the art to line up with rows in the first place). Its own `rows`/
 *   `shelfAnchorY` are ignored; rows are always evenly divided by app code.
 */
export function resolveShelfBackground(category: Category, rows: number): ResolvedShelfBackground {
  if (category === 'paper') {
    return {
      imageUri: PAPER_TEXTURE.imageUri,
      imageWidth: PAPER_TEXTURE.imageWidth,
      imageHeight: PAPER_TEXTURE.imageHeight,
      anchorsY: evenRowAnchors(rows),
    };
  }

  const variant = FIGURE_SHELF_VARIANTS.find((v) => v.rows === rows);
  if (variant && variant.shelfAnchorY.length === rows) {
    return { imageUri: variant.imageUri, imageWidth: variant.imageWidth, imageHeight: variant.imageHeight, anchorsY: variant.shelfAnchorY };
  }
  return { imageUri: null, imageWidth: null, imageHeight: null, anchorsY: evenRowAnchors(rows) };
}

export interface CoverCrop {
  /** Fraction (0-1) of the source image's height that survives resizeMode="cover" cropping. 1 = no vertical cropping. */
  visibleFraction: number;
  /** Source-image-normalized Y where the visible window starts. */
  topOffset: number;
}

/**
 * `resizeMode="cover"` scales an image uniformly until it fills the
 * container, then crops whichever axis overflows, centered. Given the
 * image's natural size and the container's rendered size, this returns how
 * much of the image's vertical extent survives — used to map a
 * `shelfAnchorY` (authored against the full source image) onto the
 * container's rendered bounds.
 */
export function computeCoverVerticalCrop(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): CoverCrop {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { visibleFraction: 1, topOffset: 0 };
  }
  const imageAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;
  if (containerAspect > imageAspect) {
    // Container is relatively wider than the image, so width-fit
    // constrains the scale and the image's height overflows — cropped.
    const visibleFraction = imageAspect / containerAspect;
    return { visibleFraction, topOffset: (1 - visibleFraction) / 2 };
  }
  return { visibleFraction: 1, topOffset: 0 }; // height-fit constrains (or an exact aspect match) — no vertical crop
}

/** Maps a source-image-normalized Y (e.g. one entry of `shelfAnchorY`) to a normalized Y within the rendered, cover-cropped container. Clamped to [0, 1] if the anchor falls outside the visible (cropped-away) window. */
export function mapImageYToContainerY(imageY: number, crop: CoverCrop): number {
  const raw = (imageY - crop.topOffset) / crop.visibleFraction;
  return Math.min(1, Math.max(0, raw));
}
