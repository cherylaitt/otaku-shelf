# Otaku Shelf

A React Native (Expo) app for anime/idol goods collectors: log purchased merch
with photos (with optional on-device background removal), arrange it on a
customizable fixed-grid virtual display, and track purchase status. Monetized
by a single banner ad on the Inventory tab — there is no gacha, no rarity
tiers, and no user-selectable background styles (see "Backgrounds are fixed
per category" below for why, and what used to be there instead).

## Getting started

```sh
npm install
npx expo start
```

Press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go on a physical device (camera/barcode features require a physical
device or a simulator with camera support).

## The category system

Every `Group` (and, indirectly, every `Item` via its parent Group) belongs to
exactly one of two permanent categories:

- **paper** — cards, postcards, posters (displayed in card holders)
- **figure** — acrylic stands, dolls, figures (displayed on shelves/drawers)

A Group's category is chosen at creation and **cannot be changed** — there is
no edit option in the UI, and the data layer (`itemsRepository`,
`groupsRepository`) rejects any attempt to assign a mismatched `ItemType` to
a Group, throwing `CategoryMismatchError`. This is enforced independently of
the UI so it can't be bypassed. Category also determines which of the two
fixed backgrounds a Group's shelf uses — see "Backgrounds are fixed per
category" below.

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

## Backgrounds are fixed per category, not user-selectable

There used to be a whole gacha-unlockable catalog of `Environment` rows
(rarity tiers, an ad-gated "pull" loop, a Skin Locker screen to browse and
equip unlocked ones). **All of that was cut** — see "What used to be here"
below. In its place, there are exactly two backgrounds, one per goods
category, defined as static constants in
`src/shared/config/shelfBackgrounds.ts` — nothing in the database, nothing
the user can browse or switch. A Group's background is derived purely from
its `category` via `resolveShelfBackground` in
`src/shared/utils/shelfBackground.ts`:

- **figure** groups get baked-in shelf art: one full variant PER supported
  row-count preset (3/4/5 — see `GRID_ROW_PRESETS`, `FIGURE_SHELF_VARIANTS`),
  each with its own image plus a hand-measured `shelfAnchorY: number[]` — a
  normalized (0-1) Y position, relative to the *full source image*, of
  each row's shelf TOP SURFACE. Resizing a figure group's rows **swaps the
  full asset** (image + anchors together) rather than overlaying/stretching
  one picture — real shelf photography/renders have uneven gaps (a shorter
  top compartment is typical), so these are never auto-generated as evenly
  spaced. This row-count swap is the one piece of the old variant system
  that survived — it's needed for resizing to work correctly, not for any
  user-facing style choice. If no variant matches a group's current row
  count, rows fall back to evenly spaced with no image.
- **paper** groups get one continuous texture (`PAPER_TEXTURE`) used as-is
  no matter the row count — there's no physical shelf in a binder page to
  line rows up against — and rows are always evenly divided by app code.

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
- The figure background ("Classic Shelf") ships genuinely distinct art per
  row-count preset, each with its own hand-measured `shelfAnchorY` (see
  `FIGURE_SHELF_VARIANTS` in `shared/config/shelfBackgrounds.ts`) — adding
  another figure background variant, or replacing this art, is a drop-in
  data change there; no rendering code needs to change.

### What used to be here

Earlier iterations of this app had a full gacha/rarity system: an
`Environment` catalog stored in SQLite with `rarity` tiers
(common/rare/epic/legendary), `isUnlocked`/`unlockedAt` progress per row, an
ad-gated "pull" loop (Gacha tab, `MockAdService`), and a Skin Locker screen
to browse/equip unlocked backgrounds per group. User testing found this
added complexity without adding value, so it was removed wholesale — no
`environments` or `gacha_pulls` tables, no `Rarity`/`DisplayKind` types, no
Gacha tab, no Skin Locker, no `activeEnvironmentId` on `Group` (see
`migrateGroupsRemoveActiveEnvironmentIfNeeded` in `src/shared/db/migrate.ts`
for how an existing install's data is cleaned up on upgrade). If a
user-facing style choice is ever wanted again, it should be designed fresh
rather than resurrecting any of this.

## Project structure

```
src/
  features/
    groups/     Group List, Create Group, groups Zustand store
    items/      Add/Edit Item (photo + optional background removal +
                barcode-as-reference), Item Detail, barcode scanner, item store
    shelf/      Shelf View (drag & drop grid), slot picker
    inventory/  Inventory list (shows the one banner ad), Sold Archive
    settings/   Settings screen (reset data, about)
  shared/
    db/         SQLite client, schema, migrations, repositories
    services/   ads.ts (AdMob init/ATT), backgroundRemoval.ts, imageService.ts
    config/      shelfBackgrounds.ts — the two fixed per-category backgrounds
    components/ Reusable UI primitives (Button, TextField, pills, BannerAdSlot, etc.)
    theme/      Design tokens (colors, spacing, typography)
    types/      Shared domain models & enums
    utils/      id generation, formatting helpers
navigation/      React Navigation stack + bottom tabs
modules/
  subject-lift/ Local Expo native module — on-device background removal
                (iOS Vision / Android ML Kit), see "Background removal" below
```

## Persistence

- **Structured data** (groups, items) lives in SQLite via `expo-sqlite`,
  accessed exclusively through the repositories in `src/shared/db/repositories`.
  No screen talks to SQL directly. There is no `environments` or
  `gacha_pulls` table (see "What used to be here" above) — backgrounds are
  static config, not persisted data.
- **Photos** are copied from the OS-provided transient picker URI into the
  app's permanent document directory (`expo-file-system`'s `File`/`Directory`
  API) before the path is saved to SQLite — this is what makes photos survive
  app restarts and OS cache clears. If background removal produces a cutout,
  that cutout (not the original photo) is what gets saved as the item's
  `imageUri`, but the original stays on disk untouched (it's just not
  referenced from the item) so a future "revert" is possible while editing.

## Ad monetization

**Phase 1 (implemented): banner ads.** `src/shared/services/ads.ts` wraps
[`react-native-google-mobile-ads`](https://docs.page/invertase/react-native-google-mobile-ads)
(the standard AdMob SDK for Expo, with its own config plugin — see the
`react-native-google-mobile-ads` entry in `app.json`'s `plugins`) plus
`expo-tracking-transparency` for the iOS ATT prompt. `initializeAds()` is
called once from `App.tsx` on startup: it requests ATT (iOS only, no-op on
Android) before initializing the Mobile Ads SDK, per Apple's guidance to
resolve tracking consent before the first ad request.

`BannerAdSlot` (`src/shared/components/BannerAdSlot.tsx`) is used on
**exactly one** screen — the Inventory List/browse tab — never on Shelf
View, Add/Edit Item, or any modal/detail screen. It reserves a themed
placeholder before the ad loads, then resizes to the SDK-reported adaptive
banner height for the device's actual width (`onAdLoaded`/`onSizeChange`,
never a hardcoded height), and collapses to zero height if the ad fails to
load rather than leaving a dead gap. It's rendered as a normal flex sibling
of the list (not absolutely positioned), so the list's available space just
shrinks/grows around it — there's no separate "with banner"/"without
banner" layout branch to maintain.

Both the AdMob App IDs (in `app.json`) and the ad unit id (in `ads.ts`) are
currently Google's published **test** ids — see the `TODO` comments at both
call sites. Swap in real ids from your own AdMob console before submitting
to the stores; a new native build is required either way, since this SDK
has native code.

**Phase 2 (not implemented, by design): rewarded ads.** Flagged as future
work, gated behind features that don't exist yet — a rewarded ad to unlock
high-res/watermark-free export, and one to unlock cloud-quality background
removal once a premium tier is designed. Don't build rewarded ad UI/SDK
calls until one of those gated features actually exists.

## Background removal

When adding/editing an Item's photo, if a fresh photo was just taken or
picked, an optional **"✂️ Remove Background"** step appears — fully
on-device, no network call, no cloud API, works offline:

- **iOS 17+**: Vision framework's `VNGenerateForegroundInstanceMaskRequest`
  (subject lifting).
- **Android (API 24-35 only — see below)**: ML Kit's Subject Segmentation
  (`play-services-mlkit-subject-segmentation`).

Both are wired through a small local Expo native module,
`modules/subject-lift/` (Swift + Kotlin, using the
[Expo Modules API](https://docs.expo.dev/modules/)), behind
`src/shared/services/backgroundRemoval.ts`. That service is defensive by
design: `isAvailable()` decides whether to even show the button, and every
"couldn't do it" case (OS too old, no distinct subject found, model still
downloading) resolves to the same `{ status: 'unavailable' }` rather than an
error — the UI just keeps the original photo. The original photo is never
overwritten; only the *saved* `imageUri` is replaced by the cutout, so
"Use Original Instead" always has something to revert to.

Once saved, a cutout (a transparent-background PNG) composites naturally
onto its group's shelf background just from normal view layering — the
item's grid slot (`ShelfGrid.tsx`'s `itemSlot` style) deliberately has no
opaque background color behind it, so the shelf art already painted behind
the grid shows through any transparent pixels. A regular (non-cutout) photo
is unaffected by this, since `resizeMode="cover"` already fills the slot
completely.

**Android version cap, and why:** the only currently-published version of
`play-services-mlkit-subject-segmentation` (`16.0.0-beta1`, unpatched since
Nov 2023) has a known, unfixed native crash (a SIGSEGV from an MTE
pointer-tagging fault in its GPU delegate) on Android 16 / API 36+ — see
[googlesamples/mlkit#1017](https://github.com/googlesamples/mlkit/issues/1017).
That crash happens in native code with no catchable JS/Kotlin exception, so
`SubjectLiftModule.kt` refuses to even attempt segmentation above API 35 and
reports `isAvailable() == false` instead — a missing feature beats one that
takes the whole app down. Re-check that library's changelog periodically
and raise the cap (or switch libraries) once a fix ships.

**Status: written, not yet verified on-device.** Both native
implementations were written against each platform's documented API surface,
but this environment has no Xcode/Android emulator to compile or run them.
`modules/subject-lift` is a **brand-new native module** the current
committed `ios/` project (and any existing Android build) doesn't know
about yet — a fresh native build (`npx expo run:ios` / `npx expo run:android`,
or a new EAS build, same as any other new native dependency; see "When you
actually need a new native build" below) is required before this feature
does anything at all. Until then, `backgroundRemoval.ts` catches the
"native module not found" error and reports the feature as unavailable, so
the rest of the app keeps working normally — but "Remove Background" simply
won't appear. After rebuilding, manually test end-to-end on a real device
per the checklist in each native file's doc comment before shipping.

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

## Barcode scanning is an optional shortcut, not the main entry path

There is intentionally **no barcode → product lookup API** anywhere in this
app. General-purpose UPC/barcode databases are built for mass-market retail
goods and essentially never contain anime/idol collectibles (figures,
acrylic stands, doujin cards, event-exclusive goods) — an earlier version of
this screen tried exactly that integration, and it returned "not found" for
nearly every real item, so it was removed rather than kept as dead weight.
This is a deliberate, fixed limitation, not a gap slated for more work — see
"ADJUST: Barcode Scanning" in the project history for the explicit call not
to invest further in improving match rates or database coverage.

- **Scan Barcode** still opens the camera (`expo-camera`'s `CameraView`) and
  decodes the barcode exactly as before — that capability is unchanged.
- On a successful decode, the code is saved on the Item as a plain
  **local reference value** (`barcodeCode`) with a brief confirmation. There
  is no network call and nothing else on the form is auto-filled — so
  there's no "no match found" dead-end state to design around either; every
  scan is treated the same way, as a value to pre-fill for your own
  reference while you fill in the rest manually.
- `barcodeCode` is included in the Inventory List's search box, so you can
  always answer "have I already logged this exact barcode?" fully offline.
- Manual entry is the one, fully-supported path for every other field, and
  works completely without ever touching the scan feature — the Add/Edit
  Item form always leads with **Photo** (with optional background removal),
  then Barcode as a secondary, skippable section, then the manual fields.
  To keep manual entry fast, **Series/Franchise** and **Tags** both get
  local, offline autocomplete (`itemsRepository.suggestSeriesFranchise` /
  `.suggestTags`) drawn from your own previously-entered values — no new
  tables, no network, just a `LIKE` query (and a small in-memory dedupe for
  tags) against rows already in SQLite.

## Known limitations (MVP scope)

- **Background removal is written but not yet verified on a real device**
  — see "Status: written, not yet verified on-device" under "Background
  removal" above. Requires a fresh native build before it does anything.
- **Ads use Google's test ids everywhere** (App IDs in `app.json`, ad unit
  id in `src/shared/services/ads.ts`) — see "Ad monetization" above for
  what to swap before a store submission.
- **Android's on-device background removal is capped at API 35** due to an
  unpatched crash in the only available ML Kit Subject Segmentation release
  — see "Android version cap, and why" above. It's simply unavailable
  (never attempted, never crashes) on Android 16+ until that's fixed.
- Cloud-based/premium background removal, and rewarded ads to unlock it (or
  a future export feature), are explicitly **future work** — see "Phase 2"
  under "Ad monetization" above. Nothing for either exists yet, by design.
