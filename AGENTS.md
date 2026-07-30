# AGENTS.md — MusicNexus

## Quick Start

```bash
npm install              # deps
npx expo start           # dev server
expo run:android         # build + run on device
npx tsc --noEmit         # type-check (only check available)
```

No lint, test, or build scripts exist.

## Stack

- React Native 0.79 + Expo SDK 53 (new arch enabled, strict TS 5.8)
- Zustand (`src/store/musicStore.ts`, `tagStore.ts`) + AsyncStorage cache under Zustand
- Firebase Firestore + Auth (AsyncStorage persistence, `@ts-ignore` on `getReactNativePersistence`)
- React Navigation 7 bottom tabs: Library, Search, Tags, History, Profile
- Zod v4 validators at `src/utils/validators/` — runs on all DB writes
- `app.json` `extra` fields hold Firebase + Spotify + TIDAL secrets (do not commit real values)

## Architecture

```
App.tsx → GestureHandlerRootView → ErrorBoundary → SafeAreaProvider
          → NavigationContainer → TabNavigator + ToastContainer + StatusBar
src/
  store/            Zustand stores (offline-first queue)
  services/
    music/          Firestore CRUD + Zod, search (routes TIDAL/Spotify/Deezer), cache
    tidal/          OAuth, playlist CRUD, collection sync, rate-limited API client
    spotify/        Spotify search API only
    deezer/         Deezer search API + fallback chain
    backupService.ts   Firestore→timestamped backup + local JSON export/import
    profileService.ts  User profile (notes, rating tooltips, min rating for TIDAL save)
  components/       NeonButton, OptionsModal, MusicItem, StarRatingModal, etc.
  hooks/            useModal, useMusicOperations, useAlbumGrouping
  screens/          Library/, Search/, Tags/, History/, Profile/
  styles/           theme.ts (dark-only AMOLED), component styles alongside in styles/
  utils/            toast, date, sorting, rating helpers
  types/            SavedMusic, MusicTrack, Tag, SearchMode, etc.
```

## Key Patterns

### Offline-First
Mutations in `musicStore` update Zustand + AsyncStorage immediately, then sync Firestore. Offline queue: `dirtyMusicIds` / `deletedMusicIds` in AsyncStorage. `NetInfo` listener triggers `syncMusicWithFirestore()` on reconnect.

### Modal System
Use `useModal()` from `src/hooks/useModal.ts` → `{ showModal, modalProps }`. Spread `modalProps` onto `<OptionsModal>`. Actions auto-dismiss after firing. Never create raw modal state.

### TIDAL Collection (Library Sync)
Add/remove tracks from user's TIDAL collection:
- `POST /v2/userCollectionTracks/me/relationships/items?countryCode=US`
- **Body `data` must be an array**: `{ data: [{ type: 'tracks', id: trackId }] }`
- DELETE uses the same URL with same body format
- Path param must be `me`, not the user ID string
- OAuth scopes: `collection.read` / `collection.write`

### TIDAL Playlist Sync
- Ratings 0–10 in 0.5 increments (stored as strings in maps)
- `ratingPlaylists` map links each rating to a TIDAL playlist ID (rating 0 = "remove from old, no new")
- `syncTrackToConfiguredTidalPlaylist` moves tracks between playlists on rating change
- `syncTrackToTidalLibrary` runs in `.finally()` **after** playlist sync (not parallel) to avoid race conditions
- Playlist sync is in `.then()`, library sync in `.finally()` — both inside a `void` call
- `refreshTidalConnectionIfNeeded` has `skipPlaylistRefresh` option — use it when only account data needed
- Rate limit: 350ms between TIDAL requests (`TIDAL_REQUEST_DELAY_MS`)

### disconnect / re-authorize
- `disconnectTidalAccount()` and `finalizeTidalAuthorization()` both preserve `ratingPlaylists` from the existing account document
- Re-authorization (re-link) preserves `ratingPlaylists` via a ref captured before the OAuth redirect

### Import Flow
ImportPlaylistModal handles TIDAL/Spotify/Deezer with service selector. All imports use `skipTidalSync: true` and filter duplicates via `existingIds` set before saving.

### NeonButton
Use `<NeonButton text="" onPress={} color="..." icon="..." />` (default full-width, AMOLED black bg, colored border + tint). **Size preservation**: when converting existing buttons, preserve original padding via `style` prop. Use `compact` prop for small header/action buttons with explicit `paddingVertical: 4` and `paddingHorizontal: 10`. Never add icons to buttons that didn't have them originally.

### Conventions
- **Dark theme only** — AMOLED black (`#000000`), surface `#111`. Theme object in `src/styles/theme.ts`.
- **No code comments** unless explicitly asked
- **Toast** — `showToast(text, 'success' | 'error')` from `src/utils/toast.tsx`. Success auto-dismisses (4.5s); errors persist until tapped. Max 3 visible.
- **Ionic icons** via `@expo/vector-icons`
- **Style files** co-located in `styles/` subdirectories (e.g., `LibraryScreen.styles.ts`)
