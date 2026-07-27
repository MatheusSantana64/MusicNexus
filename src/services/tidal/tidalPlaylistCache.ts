// src/services/tidal/tidalPlaylistCache.ts
// Cache for TIDAL playlist metadata and track IDs to avoid re-scanning unchanged playlists
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'tidalPlaylistCache';

export interface PlaylistCacheEntry {
  lastModifiedAt: string;
  cachedAt: number;
  trackIds?: string[];
}

export type PlaylistCache = Record<string, PlaylistCacheEntry>;

export async function loadCache(): Promise<PlaylistCache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveCache(cache: PlaylistCache): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function getCachedPlaylistEntry(playlistId: string): Promise<PlaylistCacheEntry | null> {
  const cache = await loadCache();
  return cache[playlistId] ?? null;
}

export async function updatePlaylistCacheBatch(entries: Array<{ playlistId: string; lastModifiedAt: string; trackIds?: string[] }>): Promise<void> {
  const cache = await loadCache();
  const now = Date.now();
  for (const { playlistId, lastModifiedAt, trackIds } of entries) {
    cache[playlistId] = { lastModifiedAt, cachedAt: now, trackIds: trackIds ?? cache[playlistId]?.trackIds };
  }
  await saveCache(cache);
}

export async function clearPlaylistCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
