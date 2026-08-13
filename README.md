# Otaku Shelf

A React Native (Expo) app for anime/idol goods collectors: log purchased merch
with photos, arrange it on a customizable virtual display grid, track
purchase status, and unlock new display "environments" through a mocked
ad-gated gacha system.

## Getting started

```sh
npm install
npx expo start
```

Press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go on a physical device (camera/barcode features require a physical
device or a simulator with camera support).

## The category system

Every `Group` and `Environment` belongs to exactly one of two permanent
categories:

- **paper** — cards, postcards, posters (displayed in card holders)
- **figure** — acrylic stands, dolls, figures (displayed on shelves/drawers)

A Group's category is chosen at creation and **cannot be changed** — there is
no edit option in the UI, and the data layer (`itemsRepository`,
`groupsRepository`) rejects any attempt to assign a mismatched `ItemType` or
`Environment` to a Group, throwing `CategoryMismatchError`. This is enforced
independently of the UI so it can't be bypassed.

## Fixed grid layout, per group

Every Group owns its own fixed `rows x columns` grid — both dimensions are
plain stored fields (`item_groups.rows`, `item_groups.columns`), chosen from
preset pickers (never free-form numbers, so the grid always renders cleanly
against a fixed-aspect-ratio background image) at creation, and changeable
afterward only through the explicit **Resize Layout** screen (an edit action
on the group's Shelf View — never a gesture like long-press or drag). The
grid never grows or shrinks on its own just because items were added or
removed; capacity is 100% under the user's control.

- **Pagination**: a page always holds exactly `rows * columns` slots. If a
  group has more placed items than one page can hold, the rest spill onto
  additional pages (in the same reading order), shown as horizontally-
  swipeable pages with a page-dot indicator at the bottom. Drag-and-drop is
  scoped to a single page for now (see the code comment in `ShelfGrid.tsx` —
  cross-page dragging is a possible future enhancement).
- **Resizing** (`src/shared/utils/gridLayout.ts`, `reflowSlots`): changing
  `rows`/`columns` repacks every placed item into the new dimensions,
  row-major, using each item's *current* slot order (never a stale
  snapshot) as the ordering key:
  - **Shrinking** doesn't delete or block anything — cards that no longer
    fit on a page simply overflow onto the next one, in order, adding as
    many pages as needed.
  - **Growing** re-flows every card from scratch against the larger page
    size, which naturally merges previously-overflowed pages back together
    wherever the new capacity allows.
  - Resizing an empty group, or resizing repeatedly in a row, both fall out
    of the same function for free — there's no special-cased "empty" path
    and no cached ordering to go stale.
- Migrating from the old (pre-fixed-grid) dynamic-row model backfills each
  existing group's `rows` from whatever row count it was already visually
  displaying, so upgrading never silently reflows/shrinks anyone's shelf —
  see `migrateGroupsToRowsColumnsIfNeeded` in `src/shared/db/migrate.ts`.

## Shelf-anchored backgrounds (figure goods only)

`Environment.backgroundVariants: ShelfBackgroundVariant[]`
(`src/shared/types/models.ts`) means something different depending on the
environment's `category` — see `resolveShelfBackground` in
`src/shared/utils/shelfBackground.ts` for the authoritative branch:

- **figure** environments have baked-in shelf art: one full variant PER
  supported row-count preset (3/4/5 — see `GRID_ROW_PRESETS`), each with
  its own image plus a hand-measured `shelfAnchorY: number[]` — a
  normalized (0-1) Y position, relative to the *full source image*, of
  each row's shelf TOP SURFACE. Resizing a figure group's rows **swaps the
  full asset** (image + anchors together, via `figureShelfVariants` in
  `seedEnvironments.ts`) rather than overlaying/stretching one picture —
  real shelf photography/renders have uneven gaps (a shorter top
  compartment is typical), so these are never auto-generated as evenly
  spaced. If no variant matches a group's current row count (or the
  environment has no art at all), rows fall back to evenly spaced with no
  image, rather than ever showing art whose baked-in shelf lines don't
  line up.
- **paper** environments are unaffected by any of this: one continuous
  texture (`singleTexturePaperBackground` in `seedEnvironments.ts`) used
  as-is no matter the group's row count — there's no physical shelf in a
  binder page or con-booth backdrop to line rows up against — and rows are
  always evenly divided by app code, exactly as before this system
  existed.

For figure goods specifically:

- **Positioning items** (`ShelfGrid.tsx`): each row's items have their
  *bottom* edge placed at `shelfAnchorY[row] * containerHeight`, instead of
  dividing the available height evenly — so items visually rest on
  whatever shelf line the artist drew, even when those lines aren't evenly
  spaced. Dragging finds the nearest anchor line to the drop point rather
  than rounding to a fixed row height.
- **Cover-crop correction** (`computeCoverVerticalCrop` /
  `mapImageYToContainerY`): the background image renders with
  `resizeMode="cover"`, which crops whichever axis overflows once the
  image's aspect ratio doesn't exactly match the screen. `shelfAnchorY` is
  authored against the *uncropped* source image, so `ShelfViewScreen` maps
  it onto the actually-rendered bounds using the variant's stored
  `imageWidth`/`imageHeight` (captured once via `Image.resolveAssetSource`)
  before handing anchors to `ShelfGrid` — otherwise a shelf line near the
  top or bottom edge could land off-position on a differently-shaped
  screen.
- "Classic Shelf" currently ships illustrative, deliberately non-uniform
  placeholder `shelfAnchorY` values (top compartment shorter than the
  rest) reusing the same one bundled image across all three row-count
  presets — there's no genuinely distinct art per row count yet. Real
  per-row-count art (distinct images, each hand-measured) is a drop-in
  data change to `CLASSIC_SHELF_VARIANTS` in `seedEnvironments.ts`; no
  rendering code needs to change.

## Project structure

```
src/
  features/
    groups/     Group List, Create Group, groups Zustand store
    items/      Add/Edit Item, Item Detail, barcode scanner, item store
    shelf/      Shelf View (drag & drop grid), Skin Locker, slot picker
    gacha/      Gacha screen, weighted draw logic, gacha store
    inventory/  Inventory list, Sold Archive
    settings/   Settings screen (reset data, about)
  shared/
    db/         SQLite client, schema, migrations, seed data, repositories
    services/   AdService (mock), ImageService
    store/      Cross-feature Zustand stores (Environments catalog)
    components/ Reusable UI primitives (Button, TextField, pills, etc.)
    theme/      Design tokens (colors, spacing, typography)
    types/      Shared domain models & enums
    utils/      id generation, formatting helpers
navigation/      React Navigation stack + bottom tabs
```

## Persistence

- **Structured data** (groups, items, environments, gacha history) lives in
  SQLite via `expo-sqlite`, accessed exclusively through the repositories in
  `src/shared/db/repositories`. No screen talks to SQL directly.
- **Photos** are copied from the OS-provided transient picker URI into the
  app's permanent document directory (`expo-file-system`'s `File`/`Directory`
  API) before the path is saved to SQLite — this is what makes photos survive
  app restarts and OS cache clears.

## Swapping in a real ad SDK

Gacha pulls go through the `AdService` interface
(`src/shared/services/adService.ts`). The MVP ships `MockAdService`, which
simulates a 3–5s rewarded-ad load and always grants the reward. To go live:

1. `npx expo install react-native-google-mobile-ads` (or your ad SDK of choice).
2. Add an `AdMobAdService implements AdService` class wiring `showRewardedAd()`
   to the real SDK's load/show/reward-earned flow.
3. Change the single line in `getAdService()` to return the new
   implementation instead of the mock.

No screen or store code needs to change — everything depends only on the
`AdService` interface.

## Builds & OTA updates (EAS)

Because this app uses native modules (`expo-camera`, `expo-sqlite`,
`react-native-gesture-handler`, etc.), it needs a **custom dev/preview/
production build** — Expo Go alone won't run it. Builds are produced with
[EAS Build](https://docs.expo.dev/build/introduction/) and configured in
`eas.json` (`development`, `preview`, `production` profiles).

### Shipping a JS-only fix without a new build

Most day-to-day changes (bug fixes, UI tweaks, new screens) are pure
JavaScript and don't touch native code or add a native dependency. For those,
push an **OTA update** via [EAS Update](https://docs.expo.dev/eas-update/introduction/)
instead of rebuilding:

```sh
npx eas-cli update --channel preview --message "Fix: describe the change"
```

Anyone running a `preview`-profile build will get the new JS bundle the next
time they open (or foreground) the app — no reinstall needed. Use
`--channel production` for the production build once that profile is used.
There's also a "Check for Updates" button on the Settings screen for
on-demand testing during QA.

### When you actually need a new native build

A full `eas build` (and reinstalling the APK) is only required when:

- A new native dependency is added or an existing one is upgraded (anything
  with native/Kotlin/Swift/Obj-C code, not pure JS).
- `app.json` native config changes (permissions, icons, package name, Expo
  plugins, etc.).
- The Expo SDK itself is upgraded.

```sh
npx eas-cli build --platform android --profile preview
```

`runtimeVersion` is set to the `"appVersion"` policy (tied to the `version`
field in `app.json`), so bump `version` whenever you make one of the native
changes above — that keeps OTA updates from ever being served to a binary
that isn't compatible with them. JS-only changes should **not** bump
`version`; they just get pushed as an update to the existing runtime.

## Barcode scanning is manual-first, by design

There is intentionally **no barcode → product lookup API** anywhere in this
app. General-purpose UPC/barcode databases are built for mass-market retail
goods and essentially never contain anime/idol collectibles (figures,
acrylic stands, doujin cards, event-exclusive goods) — an earlier version of
this screen tried exactly that integration, and it returned "not found" for
nearly every real item, so it was removed rather than kept as dead weight.

- **Scan Barcode** still opens the camera (`expo-camera`'s `CameraView`) and
  decodes the barcode exactly as before — that capability is unchanged.
- On a successful decode, the code is saved on the Item as a plain
  **local reference value** (`barcodeCode`) with a brief confirmation. There
  is no network call and nothing else on the form is auto-filled.
- `barcodeCode` is included in the Inventory List's search box, so you can
  always answer "have I already logged this exact barcode?" fully offline.
- Manual entry is the one, fully-supported path for every other field. To
  keep it fast, **Series/Franchise** and **Tags** both get local, offline
  autocomplete (`itemsRepository.suggestSeriesFranchise` /
  `.suggestTags`) drawn from your own previously-entered values — no new
  tables, no network, just a `LIKE` query (and a small in-memory dedupe for
  tags) against rows already in SQLite.

## Known limitations (MVP scope)

- Most Environment artwork is still solid-color placeholders
  (`backgroundColor` on each `Environment`, `backgroundVariants: []`).
  "Classic Binder Page", "Green Binder Page", "Lavender Binder Page", and
  "Classic Shelf" have real bundled art as the first examples of the
  pattern — every screen that shows an Environment (Shelf View, Skin
  Locker, Group List thumbnail, Gacha reveal card) already prefers a
  matching `backgroundVariants` entry over the solid color when one
  exists. To add art for another starter Environment: drop an image in
  `assets/environments/` and pass it through `uniformVariantsFromImage(...)`
  in `src/shared/db/seedEnvironments.ts` (see the existing
  `*_VARIANTS` constants) — `migrate.ts`'s `syncStarterEnvironmentsIfNeeded`
  pushes it out to already-seeded installs automatically on next launch, no
  separate migration needed. See "Shelf-anchored backgrounds" above for how
  to give a piece of art real per-row-count `shelfAnchorY` positions instead
  of the uniform default.
# otaku-shelf
