# AGENTS.md — MusicNexus

## Quick Start

```bash
npm install          # install deps
npx expo start       # dev server (scan QR or press a/i)
expo run:android     # build + run on device/emulator (requires android/ prebuild)
```

There are **no** lint, test, typecheck, or build scripts. The only scripts are `start`, `android`, `ios`, `web`.

To type-check manually: `npx tsc --noEmit`

## Stack

- React Native 0.79 + Expo SDK 53 (new architecture enabled)
- TypeScript 5.8 (strict mode) — `tsconfig.json` extends `expo/tsconfig.base`
- Zustand for state (`src/store/musicStore.ts`, `src/store/tagStore.ts`)
- Firebase (Firestore + Auth with AsyncStorage persistence)
- React Navigation 7 (bottom tabs: Library, Search, Tags, History, Profile)
- No ESLint, no Prettier, no Jest, no CI

## Architecture

```
App.tsx                    # Root: ErrorBoundary > Navigation > Tabs + ToastContainer
src/
  store/                   # Zustand stores (musicStore, tagStore)
  services/
    music/                 # Music CRUD (Firebase), search, caching
    tidal/                 # TIDAL OAuth + playlist sync
    spotify/               # Spotify search API
    deezer/                # Deezer search API
  components/              # Shared UI (MusicItem, OptionsModal, StarRatingModal, etc.)
  hooks/                   # useModal, useMusicOperations, useAlbumGrouping
  Library/                 # Library screen + useLibrary hook
  Search/                  # Search screen + ImportPlaylistModal
  Tags/                    # Tags screen
  History/                 # History screen
  Profile/                 # Profile screen + TIDAL account modal
  config/                  # Firebase config
  utils/                   # Date, rating, sorting, toast, validators
  types/                   # TypeScript interfaces (SavedMusic, MusicTrack, Tag, etc.)
```

## Key Patterns

### Offline-First Optimistic Updates
Every mutation in `musicStore` updates Zustand + AsyncStorage immediately, then syncs to Firestore. When offline, changes queue in `AsyncStorage` (`deletedMusicIds`, `dirtyMusicIds`). A `NetInfo` listener triggers `syncMusicWithFirestore()` on reconnect.

### Modal System
All modals use `useModal()` hook → returns `{ showModal, modalProps }`. Spread `modalProps` onto `<OptionsModal>`. Actions auto-dismiss the modal after firing. Never create raw modal state; always use the hook.

### TIDAL Rate Limiting
- `TIDAL_REQUEST_DELAY_MS = 350` — used between paginated requests and between operations
- `TIDAL_DEBUG_ENABLED = false` — set to `true` to see structured debug logs
- DELETE operations retry 3 times with linear backoff
- 429 errors retry with exponential backoff via `fetchJsonWithBackoff`

### Rating System
- Ratings are 0–10 in 0.5 increments (stored as strings like `"5.0"`, `"6.0"` in maps)
- Rating 0 = no playlist assignment (just removal from old)
- `ratingPlaylists` map in TIDAL account links ratings to playlist IDs

### saveMusic / saveMusicBatch
- `skipTidalSync` option (default `false`) — set to `true` for batch imports or when TIDAL sync is unwanted
- `saveMusicBatch` uses `Promise.allSettled` — some tracks may silently fail
- Zod validation runs on all writes

### Import Flow
- Search tab: `ImportPlaylistModal` handles TIDAL/Spotify/Deezer imports with service selector
- TIDAL Account modal: "Import All from TIDAL Playlists" button imports all configured playlists
- Both use `skipTidalSync: true` and filter duplicates via `existingIds` set before saving

## Conventions

- **Dark theme only** — AMOLED black backgrounds (`theme.colors.background.amoled = '#000000'`). All styling via `theme` object in `src/styles/theme.ts`
- **Style files** live alongside components in `styles/` subdirectories (e.g., `LibraryScreen.styles.ts`)
- **Single-user app** — security is relaxed, no multi-tenant concerns
- **Zod validators** in `src/utils/validators/` for data validation at boundaries
- **Toast notifications** via `showToast(text, 'success' | 'error')` from `src/utils/toast.tsx`. Success auto-dismisses (2.5s); errors persist until tapped. Max 3 visible, queue for overflow.
- **No comments** in code unless explicitly asked
- **Ionic icons** via `@expo/vector-icons`

## Gotchas

- `firebaseConfig.ts` reads config from `expo-constants` `extra` field, NOT from `.env` directly
- Secrets (Spotify/TIDAL client secrets, Firebase keys) are in `app.json` under `extra` — do not commit real values
- `musicStore` auto-loads on import: `useMusicStore.getState().loadMusic()`
- `refreshTidalConnectionIfNeeded` has a `skipPlaylistRefresh` option — use it when you only need account data without the expensive playlist fetch
- `getTidalTracksByIds` does 3-step enrichment (tracks → albums with coverArt → artists with profileArt) and batches in groups of 20
- `addTrackToPlaylist` checks for duplicates before POSTing
- `removeTrackFromConfiguredPlaylist` fetches all playlist items to find the matching one — can be slow for large playlists
