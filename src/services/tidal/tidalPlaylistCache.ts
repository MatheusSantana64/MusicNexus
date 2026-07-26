// src/services/tidal/tidalPlaylistCache.ts
// Cache for TIDAL playlist lastModifiedAt timestamps to avoid re-scanning unchanged playlists
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'tidalPlaylistCache';

export interface PlaylistCacheEntry {
  lastModifiedAt: string;
  cachedAt: number;
}

export type PlaylistCache = Record<string, PlaylistCacheEntry>;

async function loadCache(): Promise<PlaylistCache> {
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

export async function getCachedLastModified(playlistId: string): Promise<string | null> {
  const cache = await loadCache();
  return cache[playlistId]?.lastModifiedAt ?? null;
}

export async function getPlaylistLastModifiedMap(playlistIds: string[]): Promise<Map<string, string>> {
  const cache = await loadCache();
  const map = new Map<string, string>();
  for (const id of playlistIds) {
    const entry = cache[id];
    if (entry) map.set(id, entry.lastModifiedAt);
  }
  return map;
}

export async function updatePlaylistCache(playlistId: string, lastModifiedAt: string): Promise<void> {
  const cache = await loadCache();
  cache[playlistId] = { lastModifiedAt, cachedAt: Date.now() };
  await saveCache(cache);
}

export async function updatePlaylistCacheBatch(entries: Array<{ playlistId: string; lastModifiedAt: string }>): Promise<void> {
  const cache = await loadCache();
  const now = Date.now();
  for (const { playlistId, lastModifiedAt } of entries) {
    cache[playlistId] = { lastModifiedAt, cachedAt: now };
  }
  await saveCache(cache);
}

export async function clearPlaylistCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
