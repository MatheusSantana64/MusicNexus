// src/services/tidal/tidalAccountService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { MusicTrack } from '../../types';
import { getTidalTracksByIds } from './tidalApiClient';

const TIDAL_API_URL = 'https://openapi.tidal.com/v2';
const TIDAL_ACCOUNT_DOC_ID = 'tidal';
const TIDAL_CACHE_KEY = 'tidalAccountCache';
const TIDAL_DISCOVERY = {
  authorizationEndpoint: 'https://login.tidal.com/authorize',
  tokenEndpoint: 'https://auth.tidal.com/v1/oauth2/token',
} as const;

const TIDAL_DEBUG_ENABLED = true;
const TIDAL_REQUEST_DELAY_MS = 350;

export interface TidalTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

export interface TidalPlaylistSummary {
  id: string;
  title: string;
  numberOfTracks?: number;
  description?: string;
  imageUrl?: string;
  ownerName?: string;
}

export interface TidalAccountData {
  connected: boolean;
  tokenSet?: TidalTokenSet;
  userId?: string;
  displayName?: string;
  playlists?: TidalPlaylistSummary[];
  ratingPlaylists?: Record<string, string>;
  lastSyncedAt?: number;
  updatedAt?: number;
}

export interface TidalPlaylistItem {
  id: string;
  type?: string;
  meta?: {
    itemId?: string;
    addedAt?: string;
    itemCursor?: string;
    [key: string]: unknown;
  };
}

export interface TidalPlaylistSyncIssue {
  trackId: string;
  trackTitle?: string;
  artist?: string;
  playlistIds: string[];
  playlistRatings: string[];
  playlistDetails: Array<{ playlistId: string; rating: string; addedAt?: string }>;
  libraryRating?: number;
  libraryTimestamp?: string;
  conflictType: 'missing' | 'mismatch' | 'duplicate';
}

export interface TidalReconcileCheckpoint {
  scannedPlaylists: string[];
  remainingPlaylists: string[];
  issues: TidalPlaylistSyncIssue[];
  duplicateTracks: Array<{ trackId: string; playlists: { playlistId: string; rating: string; addedAt?: string }[] }>;
}

type TidalDocListener = (data: TidalAccountData) => void;

let tidalAccountSnapshotUnsub: (() => void) | null = null;
const tidalAccountListeners = new Set<TidalDocListener>();

function getTidalConfig() {
  const extra = Constants.expoConfig?.extra || {};
  return {
    clientId: extra.EXPO_PUBLIC_TIDAL_CLIENT_ID as string,
    clientSecret: extra.EXPO_PUBLIC_TIDAL_CLIENT_SECRET as string,
  };
}

function getTidalDocRef() {
  return doc(db, 'userProfile', TIDAL_ACCOUNT_DOC_ID);
}

function normalizePlaylistDescription(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function debugTidal(label: string, payload: unknown): void {
  if (!TIDAL_DEBUG_ENABLED) return;
  console.log(`[tidalAccountService][debug] ${label}`, JSON.stringify(payload, null, 2));
}

async function fetchJson(url: string, token: string): Promise<any> {
  const normalizedUrl = url.startsWith('http') ? url : `${TIDAL_API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const response = await fetch(normalizedUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
  });
  if (!response.ok) {
    const body = await response.text();
    debugTidal('fetchJson error', { url: normalizedUrl, status: response.status, statusText: response.statusText, body });
    throw new Error(`TIDAL request failed (${response.status} ${response.statusText}): ${body}`);
  }
  return response.json();
}

async function fetchJsonWithBackoff(url: string, token: string, attempts = 3): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, TIDAL_REQUEST_DELAY_MS * attempt));
      }
      return await fetchJson(url, token);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('(429')) {
        throw error;
      }
      debugTidal('fetchJson retry', { url, attempt: attempt + 1, attempts });
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError || 'TIDAL request failed'));
}

function normalizeRatingKey(rating: number | string): string {
  const value = typeof rating === 'number' ? rating : Number(rating);
  return Number.isFinite(value) ? value.toFixed(1) : String(rating);
}

function getLatestRatingTimestamp(track: { savedAt?: Date; ratingHistory?: { timestamp: string }[] }): number {
  const historyTimestamps = (track.ratingHistory || [])
    .map(entry => Date.parse(entry.timestamp))
    .filter(time => Number.isFinite(time));
  if (historyTimestamps.length > 0) {
    return Math.max(...historyTimestamps);
  }
  return track.savedAt ? track.savedAt.getTime() : 0;
}

function parseAddedAt(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractResourceArray(document: any): any[] {
  if (Array.isArray(document?.data)) return document.data;
  if (document?.data) return [document.data];
  return [];
}

function extractNextLink(document: any): string | undefined {
  return document?.links?.next || document?.data?.links?.next;
}

function getRedirectUri() {
  return 'musicnexus://tidal-auth';
}

async function postTokenForm(fields: Record<string, string>): Promise<any> {
  const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(fields).toString(),
  });

  if (!response.ok) {
    throw new Error(`TIDAL token request failed (${response.status} ${response.statusText}): ${await response.text()}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TidalTokenSet> {
  const { clientId, clientSecret } = getTidalConfig();
  const tokenResponse = await postTokenForm({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const accessToken = tokenResponse.access_token || tokenResponse.accessToken;
  if (!accessToken) {
    throw new Error('TIDAL refresh response was incomplete');
  }
  return {
    accessToken,
    refreshToken: tokenResponse.refresh_token || tokenResponse.refreshToken || refreshToken,
    expiresAt: Date.now() + (Number(tokenResponse.expires_in || tokenResponse.expiresIn) || 3600) * 1000,
    scope: tokenResponse.scope,
    tokenType: tokenResponse.token_type || tokenResponse.tokenType,
  };
}

async function getMe(token: string): Promise<{ id?: string; displayName?: string }> {
  try {
    const data = await fetchJson(`${TIDAL_API_URL}/users/me?countryCode=US`, token);
    return {
      id: data?.data?.id,
      displayName: data?.data?.attributes?.name || data?.data?.attributes?.displayName || data?.data?.attributes?.username,
    };
  } catch {
    return {};
  }
}

async function fetchPlaylistDocumentPages(endpoint: string, token: string, maxPages = 6): Promise<any[]> {
  const collected: any[] = [];
  let nextEndpoint: string | undefined = endpoint;

  for (let page = 0; page < maxPages && nextEndpoint; page += 1) {
    const document = await fetchJsonWithBackoff(nextEndpoint, token);
    collected.push(...extractResourceArray(document));
    const nextLink = extractNextLink(document);
    nextEndpoint = nextLink ? nextLink : undefined;
  }

  return collected;
}

async function fetchOwnedPlaylists(token: string, userId?: string): Promise<TidalPlaylistSummary[]> {
  const collected = new Map<string, TidalPlaylistSummary>();
  const ownerFilter = userId || 'me';
  const endpoint = `${TIDAL_API_URL}/playlists?countryCode=US&filter[owners.id]=${encodeURIComponent(ownerFilter)}&include=coverArt,owners`;

  try {
    const playlists = await fetchPlaylistDocumentPages(endpoint, token);
    for (const playlist of playlists) {
      const ownerIds = new Set(
        [
          ...(playlist.relationships?.owners?.data || []),
          ...(playlist.relationships?.ownerProfiles?.data || []),
          ...(playlist.relationships?.owner?.data ? [playlist.relationships.owner.data] : []),
        ]
          .map((owner: any) => String(owner?.id || ''))
          .filter(Boolean)
      );

      if (userId && ownerIds.size > 0 && !ownerIds.has(userId)) {
        continue;
      }

      const playlistSummary: TidalPlaylistSummary = {
        id: String(playlist.id || ''),
        title: String(playlist.attributes?.title || playlist.attributes?.name || ''),
        numberOfTracks: Number(playlist.attributes?.numberOfTracks || playlist.attributes?.trackCount || 0) || undefined,
        description: normalizePlaylistDescription(playlist.attributes?.description),
        imageUrl: playlist.attributes?.images?.[0]?.url || playlist.attributes?.imageUrl || playlist.attributes?.image?.url,
        ownerName: playlist.attributes?.ownerName || playlist.attributes?.creatorName,
      };

      if (playlistSummary.id && playlistSummary.title) {
        collected.set(playlistSummary.id, playlistSummary);
      }
    }
  } catch (error) {
    console.warn('[tidalAccountService] Playlist fetch failed for endpoint:', endpoint, error);
  }

  return [...collected.values()];
}

async function fetchPlaylistTrackIds(playlistId: string, token: string): Promise<Set<string>> {
  try {
    const items = await fetchPlaylistRelationshipItems(playlistId, token);
    debugTidal('playlist items', { playlistId, count: items.length, items: items.slice(0, 25) });
    return new Set(items.map(item => String(item.id || '')).filter(Boolean));
  } catch (error) {
    console.warn('[tidalAccountService] Failed to read playlist items for duplicate check:', playlistId, error);
    return new Set();
  }
}

async function fetchPlaylistRelationshipItems(playlistId: string, token: string): Promise<any[]> {
  const endpoint = `${TIDAL_API_URL}/playlists/${encodeURIComponent(playlistId)}/relationships/items?countryCode=US&include=items`;
  const collected: any[] = [];
  let nextEndpoint: string | undefined = endpoint;

  for (let page = 0; page < 50 && nextEndpoint; page += 1) {
    if (page > 0) {
      await new Promise(resolve => setTimeout(resolve, TIDAL_REQUEST_DELAY_MS));
    }
    const document = await fetchJsonWithBackoff(nextEndpoint, token);
    const pageItems = extractResourceArray(document);
    collected.push(...pageItems);
    debugTidal('playlist items page', {
      playlistId,
      page,
      pageCount: pageItems.length,
      next: extractNextLink(document) || null,
      sample: pageItems.slice(0, 3),
    });
    nextEndpoint = extractNextLink(document) || undefined;
  }

  return collected;
}

export async function fetchTidalPlaylistItems(playlistId: string, token: string): Promise<TidalPlaylistItem[]> {
  const items = await fetchPlaylistRelationshipItems(playlistId, token);
  return items as TidalPlaylistItem[];
}

async function addTrackToPlaylist(playlistId: string, trackId: string, token: string): Promise<void> {
  debugTidal('addTrackToPlaylist request', { playlistId, trackId });
  const existingItems = await fetchPlaylistRelationshipItems(playlistId, token);
  const alreadyExists = existingItems.some(item => String(item?.id || '') === trackId);
  if (alreadyExists) {
    debugTidal('addTrackToPlaylist skip duplicate', { playlistId, trackId });
    return;
  }
  const response = await fetch(
    `${TIDAL_API_URL}/playlists/${encodeURIComponent(playlistId)}/relationships/items?countryCode=US`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: [{ type: 'tracks', id: trackId, meta: {} }],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    debugTidal('addTrackToPlaylist response error', { playlistId, trackId, status: response.status, statusText: response.statusText, body });
    throw new Error(`TIDAL playlist update failed (${response.status} ${response.statusText}): ${body}`);
  }
}

export async function addTrackToConfiguredPlaylist(playlistId: string, trackId: string): Promise<void> {
  const account = await refreshTidalConnectionIfNeeded();
  if (!account.connected || !account.tokenSet?.accessToken) return;
  await addTrackToPlaylist(playlistId, trackId, account.tokenSet.accessToken);
}

export async function removeTrackFromConfiguredPlaylist(playlistId: string, trackId: string): Promise<void> {
  const account = await refreshTidalConnectionIfNeeded();
  if (!account.connected || !account.tokenSet?.accessToken) return;
  await removeTrackFromPlaylist(playlistId, trackId, account.tokenSet.accessToken);
}

async function removeTrackFromPlaylist(playlistId: string, trackId: string, token: string): Promise<void> {
  const items = await fetchPlaylistRelationshipItems(playlistId, token);
  debugTidal('removeTrackFromPlaylist fetched document', {
    playlistId,
    trackId,
    count: items.length,
    items: items.slice(0, 25),
  });
  const matchingItems = items.filter(item => {
    const candidateIds = [
      item?.id,
      item?.attributes?.id,
      item?.attributes?.track?.id,
      item?.relationships?.track?.data?.id,
      item?.meta?.trackId,
      item?.meta?.item?.id,
      item?.meta?.resource?.id,
      item?.relationships?.item?.data?.id,
      item?.relationships?.resource?.data?.id,
      item?.attributes?.trackId,
    ];
    return candidateIds.map(value => String(value || '')).includes(trackId);
  });
  const remainingItems = items.filter(item => !matchingItems.includes(item));
  const deletePayload = {
    data: matchingItems.map(item => ({
      type: String(item?.type || 'tracks'),
      id: String(item?.id || trackId),
      meta: item?.meta && typeof item.meta === 'object'
        ? item.meta
        : {
            itemId: String(item?.meta?.itemId || item?.attributes?.itemId || item?.id || trackId),
          },
    })),
  };

  debugTidal('removeTrackFromPlaylist state', {
    playlistId,
    trackId,
    totalItems: items.length,
    matchingCount: matchingItems.length,
    matchingItems,
    remainingCount: remainingItems.length,
    remainingItemsPreview: remainingItems.slice(0, 3),
    deletePayload,
  });

  const deleteUrl = `${TIDAL_API_URL}/playlists/${encodeURIComponent(playlistId)}/relationships/items?countryCode=US`;
  let lastDeleteError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, TIDAL_REQUEST_DELAY_MS * (attempt + 1)));
    }
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(deletePayload),
    });

    if (response.ok) return;
    lastDeleteError = response;
    const body = await response.text();
    const isTransient = response.status === 429 || response.status >= 500;
    if (!isTransient) {
      debugTidal('removeTrackFromPlaylist response error', { playlistId, trackId, status: response.status, statusText: response.statusText, body, deletePayload });
      throw new Error(`TIDAL playlist removal failed (${response.status} ${response.statusText}): ${body}`);
    }
    debugTidal('removeTrackFromPlaylist retry', { playlistId, trackId, status: response.status, attempt: attempt + 1 });
  }

  const fallback = lastDeleteError as Response;
  const fallbackBody = fallback ? await fallback.text().catch(() => '') : '';
  throw new Error(`TIDAL playlist removal failed after retries (${fallback?.status} ${fallback?.statusText}): ${fallbackBody}`);
}

function getTrackById(savedMusic: { id: string; title: string; artist: string; rating: number; savedAt: Date; ratingHistory?: { timestamp: string }[] }[], trackId: string) {
  return savedMusic.find(track => track.id === trackId) || null;
}

export async function reconcileTidalRatingPlaylists(
  savedMusic: { id: string; title: string; artist: string; rating: number; savedAt: Date; ratingHistory?: { timestamp: string }[] }[],
  playlistId?: string
): Promise<TidalReconcileCheckpoint> {
  const account = await refreshTidalConnectionIfNeeded();
  if (!account.connected || !account.tokenSet?.accessToken) {
    return { scannedPlaylists: [], remainingPlaylists: [], issues: [], duplicateTracks: [] };
  }

  const playlists = account.ratingPlaylists || {};
  const entries = Object.entries(playlists).filter(([, mappedPlaylistId]) => !playlistId || mappedPlaylistId === playlistId);
  if (entries.length === 0) {
    return {
      scannedPlaylists: [],
      remainingPlaylists: Object.values(playlists),
      issues: [],
      duplicateTracks: [],
    };
  }

  const [rating, targetPlaylistId] = entries[0];
  debugTidal('reconcile checkpoint start', { playlistId: targetPlaylistId, rating, totalConfigured: Object.keys(playlists).length });
  const playlistEntries = [
    {
      rating,
      playlistId: targetPlaylistId,
      items: await fetchTidalPlaylistItems(targetPlaylistId, account.tokenSet!.accessToken),
    },
  ];

  const trackLocations = new Map<string, Array<{ playlistId: string; rating: string; addedAt?: string; tidalTitle?: string; tidalArtist?: string }>>();
  for (const entry of playlistEntries) {
    for (const item of entry.items) {
      const trackId = String(item.id || '');
      if (!trackId) continue;
      const locations = trackLocations.get(trackId) || [];
      locations.push({
        playlistId: entry.playlistId,
        rating: entry.rating,
        addedAt: item.meta?.addedAt,
      });
      trackLocations.set(trackId, locations);
    }
  }

  const issues: TidalPlaylistSyncIssue[] = [];
  const duplicateTracks: Array<{ trackId: string; playlists: { playlistId: string; rating: string; addedAt?: string }[] }> = [];

  for (const [trackId, locations] of trackLocations.entries()) {
    const track = getTrackById(savedMusic, trackId);
    if (!track) {
      issues.push({
        trackId,
        trackTitle: undefined,
        artist: undefined,
        playlistIds: locations.map(l => l.playlistId),
        playlistRatings: locations.map(l => l.rating),
        playlistDetails: locations,
        conflictType: 'missing',
      });
      continue;
    }

    if (locations.length > 1) {
      duplicateTracks.push({ trackId, playlists: locations });
      issues.push({
        trackId,
        trackTitle: track.title,
        artist: track.artist,
        playlistIds: locations.map(l => l.playlistId),
        playlistRatings: locations.map(l => l.rating),
        playlistDetails: locations,
        libraryRating: track.rating,
        libraryTimestamp: new Date(getLatestRatingTimestamp(track)).toISOString(),
        conflictType: 'duplicate',
      });
      continue;
    }

    const location = locations[0];
    const playlistAddedAt = parseAddedAt(location.addedAt);
    const latestRatingAt = getLatestRatingTimestamp(track);
    if (Number(track.rating) !== Number(location.rating)) {
      const titleMismatch =
        !!location.tidalTitle &&
        !!track.title &&
        location.tidalTitle.toLowerCase() !== track.title.toLowerCase();
      const artistMismatch =
        !!location.tidalArtist &&
        !!track.artist &&
        location.tidalArtist.toLowerCase() !== track.artist.toLowerCase();
      issues.push({
        trackId,
        trackTitle: track.title,
        artist: track.artist,
        playlistIds: [location.playlistId],
        playlistRatings: [location.rating],
        playlistDetails: [location],
        libraryRating: track.rating,
        libraryTimestamp: latestRatingAt ? new Date(latestRatingAt).toISOString() : undefined,
        conflictType: 'mismatch',
      });
    }
  }

  debugTidal('reconcile checkpoint end', {
    playlistId: targetPlaylistId,
    issues: issues.length,
    duplicates: duplicateTracks.length,
  });

  return {
    scannedPlaylists: [targetPlaylistId],
    remainingPlaylists: entries.slice(1).map(([, id]) => id),
    issues,
    duplicateTracks,
  };
}

async function loadTidalAccountFromFirestore(): Promise<TidalAccountData> {
  const snap = await getDoc(getTidalDocRef());
  if (!snap.exists()) return { connected: false };
  return snap.data() as TidalAccountData;
}

async function saveTidalAccount(data: TidalAccountData): Promise<void> {
  const updatedAt = Date.now();
  const raw = { ...data, updatedAt };
  const payload = stripUndefined(raw);
  await setDoc(getTidalDocRef(), payload, { merge: true });
  await AsyncStorage.setItem(TIDAL_CACHE_KEY, JSON.stringify(payload));
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result[key] = value.map(item =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? stripUndefined(item as Record<string, unknown>)
          : item
      );
    } else if (value !== null && typeof value === 'object') {
      result[key] = stripUndefined(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function startSnapshot() {
  if (tidalAccountSnapshotUnsub) return;
  tidalAccountSnapshotUnsub = onSnapshot(getTidalDocRef(), snap => {
    const data = snap.exists() ? (snap.data() as TidalAccountData) : { connected: false };
    AsyncStorage.setItem(TIDAL_CACHE_KEY, JSON.stringify(data));
    tidalAccountListeners.forEach(cb => {
      try { cb(data); } catch (error) { console.error('[tidalAccountService] listener error', error); }
    });
  });
}

function stopSnapshot() {
  if (tidalAccountSnapshotUnsub && tidalAccountListeners.size === 0) {
    tidalAccountSnapshotUnsub();
    tidalAccountSnapshotUnsub = null;
  }
}

export function subscribeToTidalAccountChanges(callback: TidalDocListener) {
  tidalAccountListeners.add(callback);
  startSnapshot();
  return () => {
    tidalAccountListeners.delete(callback);
    stopSnapshot();
  };
}

export async function getTidalAccountData(): Promise<TidalAccountData> {
  const cacheJson = await AsyncStorage.getItem(TIDAL_CACHE_KEY);
  const cache = cacheJson ? JSON.parse(cacheJson) as TidalAccountData : null;
  const firestoreData = await loadTidalAccountFromFirestore();
  if (firestoreData.updatedAt && (!cache?.updatedAt || firestoreData.updatedAt > cache.updatedAt)) {
    return firestoreData;
  }
  return cache || firestoreData;
}

export async function connectTidalAccountFromRedirect(url: string): Promise<TidalAccountData> {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  const error = parsed.searchParams.get('error');
  if (error) throw new Error(parsed.searchParams.get('error_description') || error);
  if (!code) throw new Error('Missing TIDAL authorization code');
  return finalizeTidalAuthorization(code, undefined);
}

export async function refreshTidalConnectionIfNeeded(data?: TidalAccountData, options?: { skipPlaylistRefresh?: boolean }): Promise<TidalAccountData> {
  const account = data || await getTidalAccountData();
  if (!account.connected || !account.tokenSet) return account;

  if (Date.now() < account.tokenSet.expiresAt - 60_000) {
    return account;
  }

  const tokenSet = await refreshAccessToken(account.tokenSet.refreshToken);
  const updated: TidalAccountData = {
    ...account,
    tokenSet,
    lastSyncedAt: Date.now(),
    connected: true,
  };

  if (!options?.skipPlaylistRefresh) {
    const playlists = await fetchOwnedPlaylists(tokenSet.accessToken, account.userId);
    updated.playlists = playlists;
  }

  await saveTidalAccount(updated);
  return updated;
}

export async function updateTidalRatingPlaylists(ratingPlaylists: Record<string, string>): Promise<TidalAccountData> {
  const account = await getTidalAccountData();
  const updated: TidalAccountData = {
    ...account,
    connected: Boolean(account.connected),
    ratingPlaylists,
    updatedAt: Date.now(),
  };
  await saveTidalAccount(updated);
  return updated;
}

export function getRatingPlaylistForRating(account: TidalAccountData | null | undefined, rating: number): string | null {
  const key = normalizeRatingKey(rating);
  return account?.ratingPlaylists?.[key] || null;
}

export async function syncTrackToConfiguredTidalPlaylist(track: { id: string; rating: number; previousRating?: number; firebaseId?: string | null }): Promise<void> {
  try {
    const account = await refreshTidalConnectionIfNeeded();
    if (!account.connected || !account.tokenSet?.accessToken) return;
    if (!track?.id || !Number.isFinite(track.rating) || track.rating <= 0) return;

    const playlistId = getRatingPlaylistForRating(account, track.rating);
    const accessToken = account.tokenSet.accessToken;
    const previousPlaylistId = Number.isFinite(track.previousRating ?? NaN)
      ? getRatingPlaylistForRating(account, track.previousRating as number)
      : null;

    if (previousPlaylistId && previousPlaylistId !== playlistId) {
      try {
        await removeTrackFromPlaylist(previousPlaylistId, track.id, accessToken);
        await new Promise(resolve => setTimeout(resolve, TIDAL_REQUEST_DELAY_MS));
      } catch (error) {
        console.warn('[tidalAccountService] Failed to remove track from configured TIDAL playlist:', previousPlaylistId, error);
      }
    }

    if (!playlistId) return;

    if (previousPlaylistId === playlistId) return;

    await addTrackToPlaylist(playlistId, track.id, accessToken);
    await saveTidalAccount({
      ...account,
      lastSyncedAt: Date.now(),
    });
  } catch (error) {
    console.error('[tidalAccountService] Failed to sync track to TIDAL playlist:', error);
  }
}

export async function importFromConfiguredPlaylists(
  existingTrackIds: Set<string>,
  ratings?: number[]
): Promise<Array<{ rating: number; tracks: MusicTrack[] }>> {
  const account = await refreshTidalConnectionIfNeeded(undefined, { skipPlaylistRefresh: true });
  if (!account.connected || !account.tokenSet?.accessToken) {
    throw new Error('Please connect your TIDAL account first.');
  }

  const token = account.tokenSet.accessToken;
  const results: Array<{ rating: number; tracks: MusicTrack[] }> = [];
  const allMissingFromResolve: Array<{ rating: number; requestedIds: string[]; resolvedIds: string[]; missingIds: string[] }> = [];

  for (const [ratingStr, playlistId] of Object.entries(account.ratingPlaylists || {})) {
    const rating = Number(ratingStr);
    if (!playlistId || !Number.isFinite(rating) || rating <= 0) continue;
    if (ratings && !ratings.includes(rating)) continue;

    try {
      const items = await fetchTidalPlaylistItems(playlistId, token);
      const allIds = items.map(item => String(item.id || '')).filter(Boolean);
      const trackIds = allIds.filter(id => !existingTrackIds.has(id));
      const skippedExisting = allIds.length - trackIds.length;

      console.log(`[import] Rating ${rating} playlist ${playlistId}: ${allIds.length} total items, ${skippedExisting} already in library, ${trackIds.length} new to import`);

      if (trackIds.length === 0) continue;

      const tracks = await getTidalTracksByIds(trackIds, token);
      const resolvedIds = new Set(tracks.map(t => t.id));
      const missingIds = trackIds.filter(id => !resolvedIds.has(id));

      if (missingIds.length > 0) {
        console.warn(`[import] Rating ${rating}: ${missingIds.length} tracks FAILED to resolve:`, missingIds);
        allMissingFromResolve.push({ rating, requestedIds: trackIds, resolvedIds: tracks.map(t => t.id), missingIds });
      }

      console.log(`[import] Rating ${rating}: resolved ${tracks.length}/${trackIds.length} tracks`);
      for (const track of tracks) {
        console.log(`[import]   ✓ ${track.title} — ${track.artist.name} — cover: ${track.album.cover ? 'YES' : 'NO'} — pos: ${track.track_position ?? 'none'}`);
      }

      if (tracks.length > 0) {
        results.push({ rating, tracks });
      }
    } catch (error) {
      console.warn('[tidalAccountService] Failed to import from playlist:', playlistId, error);
    }
  }

  if (allMissingFromResolve.length > 0) {
    console.warn('[import] === MISSING TRACKS SUMMARY ===');
    console.warn('[import] These tracks were not returned by the TIDAL batch API and could not be recovered:');
    for (const entry of allMissingFromResolve) {
      console.warn(`[import] Rating ${entry.rating}:`);
      for (const id of entry.missingIds) {
        console.warn(`[import]   - TIDAL ID: ${id}  (https://tidal.com/browse/track/${id})`);
      }
    }
    const allMissingIds = allMissingFromResolve.flatMap(e => e.missingIds);
    console.warn('[import] === COPY THIS LIST ===');
    console.warn('[import] ' + allMissingIds.join(', '));
  }

  const totalResolved = results.reduce((sum, r) => sum + r.tracks.length, 0);
  const totalMissing = allMissingFromResolve.reduce((sum, e) => sum + e.missingIds.length, 0);
  console.log(`[import] === IMPORT SUMMARY === ${totalResolved} resolved, ${totalMissing} missing across ${results.length} playlists`);

  return results;
}

export async function disconnectTidalAccount(): Promise<void> {
  const existing = await getTidalAccountData();
  await setDoc(getTidalDocRef(), {
    connected: false,
    tokenSet: null,
    playlists: [],
    ratingPlaylists: existing.ratingPlaylists || {},
    userId: null,
    displayName: null,
    lastSyncedAt: null,
    updatedAt: Date.now(),
  }, { merge: false });
  await AsyncStorage.removeItem(TIDAL_CACHE_KEY);
}

export function isTidalAuthRedirect(url: string): boolean {
  return url.startsWith('musicnexus://tidal-auth');
}

export function getTidalRedirectUri(): string {
  return getRedirectUri();
}

export function getTidalAuthDiscovery() {
  return TIDAL_DISCOVERY;
}

export function getTidalAuthRequestConfig() {
  const { clientId } = getTidalConfig();
  return {
    clientId,
    scopes: ['playlists.read', 'playlists.write', 'user.read'],
    redirectUri: 'musicnexus://tidal-auth',
    usePKCE: true,
  };
}

export async function finalizeTidalAuthorization(code: string, codeVerifier?: string): Promise<TidalAccountData> {
  const existing = await getTidalAccountData();
  const { clientId, clientSecret } = getTidalConfig();
  const tokenResponse = await postTokenForm({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: codeVerifier || '',
  });
  const accessToken = tokenResponse.access_token || tokenResponse.accessToken;
  if (!accessToken) {
    throw new Error('TIDAL token exchange response was incomplete');
  }
  const tokenSet: TidalTokenSet = {
    accessToken,
    refreshToken: tokenResponse.refresh_token || tokenResponse.refreshToken || '',
    expiresAt: Date.now() + (Number(tokenResponse.expires_in || tokenResponse.expiresIn) || 3600) * 1000,
    scope: tokenResponse.scope,
    tokenType: tokenResponse.token_type || tokenResponse.tokenType,
  };
  const me = await getMe(tokenSet.accessToken);
  const playlists = await fetchOwnedPlaylists(tokenSet.accessToken, me.id);
  const data: TidalAccountData = {
    connected: true,
    tokenSet,
    userId: me.id,
    displayName: me.displayName,
    playlists,
    ratingPlaylists: existing.ratingPlaylists || {},
    lastSyncedAt: Date.now(),
  };
  await saveTidalAccount(data);
  return data;
}

export async function refreshTidalPlaylistsOnly(): Promise<TidalAccountData> {
  const account = await getTidalAccountData();
  if (!account.connected || !account.tokenSet?.accessToken) return account;
  const playlists = await fetchOwnedPlaylists(account.tokenSet.accessToken, account.userId);
  const updated: TidalAccountData = {
    ...account,
    playlists,
    lastSyncedAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveTidalAccount(updated);
  return updated;
}

export function getTidalRatingKeys(): string[] {
  return Array.from({ length: 21 }, (_, index) => (10 - index * 0.5).toFixed(1));
}
