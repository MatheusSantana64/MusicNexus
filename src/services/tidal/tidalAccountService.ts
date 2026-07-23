// src/services/tidal/tidalAccountService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const TIDAL_API_URL = 'https://openapi.tidal.com/v2';
const TIDAL_ACCOUNT_DOC_ID = 'tidal';
const TIDAL_CACHE_KEY = 'tidalAccountCache';
const TIDAL_DISCOVERY = {
  authorizationEndpoint: 'https://login.tidal.com/authorize',
  tokenEndpoint: 'https://auth.tidal.com/v1/oauth2/token',
} as const;

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

async function fetchJson(url: string, token: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
  });
  if (!response.ok) {
    throw new Error(`TIDAL request failed (${response.status} ${response.statusText}): ${await response.text()}`);
  }
  return response.json();
}

function normalizeRatingKey(rating: number | string): string {
  const value = typeof rating === 'number' ? rating : Number(rating);
  return Number.isFinite(value) ? value.toFixed(1) : String(rating);
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
    const document = await fetchJson(nextEndpoint, token);
    collected.push(...extractResourceArray(document));
    const nextLink = extractNextLink(document);
    nextEndpoint = nextLink ? nextLink : undefined;
  }

  return collected;
}

async function fetchOwnedPlaylists(token: string, userId?: string): Promise<TidalPlaylistSummary[]> {
  const collected = new Map<string, TidalPlaylistSummary>();
  const endpoints = [
    `${TIDAL_API_URL}/playlists?countryCode=US&include=coverArt,owners`,
    `${TIDAL_API_URL}/users/me/relationships/playlists?countryCode=US&include=coverArt,owners`,
  ];

  for (const endpoint of endpoints) {
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
  }

  if (collected.size === 0) {
    try {
      const me = await getMe(token);
      const fallbackEndpoints = [
        `${TIDAL_API_URL}/users/me?countryCode=US&include=playlists,playlists.owners,playlists.coverArt`,
        `${TIDAL_API_URL}/users/${encodeURIComponent(me.id || 'me')}/relationships/playlists?countryCode=US&include=coverArt,owners`,
      ];

      for (const endpoint of fallbackEndpoints) {
        const documents = await fetchPlaylistDocumentPages(endpoint, token);
        for (const playlist of documents) {
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
      }
    } catch (error) {
      console.warn('[tidalAccountService] Playlist fallback fetch failed:', error);
    }
  }

  return [...collected.values()];
}

async function fetchPlaylistTrackIds(playlistId: string, token: string): Promise<Set<string>> {
  try {
    const document = await fetchJson(
      `${TIDAL_API_URL}/playlists/${encodeURIComponent(playlistId)}/relationships/items?countryCode=US`,
      token
    );
    const items = extractResourceArray(document);
    return new Set(items.map(item => String(item.id || '')).filter(Boolean));
  } catch (error) {
    console.warn('[tidalAccountService] Failed to read playlist items for duplicate check:', playlistId, error);
    return new Set();
  }
}

async function addTrackToPlaylist(playlistId: string, trackId: string, token: string): Promise<void> {
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
    throw new Error(`TIDAL playlist update failed (${response.status} ${response.statusText}): ${await response.text()}`);
  }
}

async function removeTrackFromPlaylist(playlistId: string, trackId: string, token: string): Promise<void> {
  const document = await fetchJson(
    `${TIDAL_API_URL}/playlists/${encodeURIComponent(playlistId)}/relationships/items?countryCode=US`,
    token
  );
  const items = extractResourceArray(document);
  const match = items.find(item => {
    const candidateIds = [
      item?.id,
      item?.meta?.trackId,
      item?.meta?.item?.id,
      item?.meta?.resource?.id,
      item?.relationships?.track?.data?.id,
      item?.relationships?.item?.data?.id,
      item?.relationships?.resource?.data?.id,
      item?.attributes?.trackId,
    ];
    return candidateIds.map(value => String(value || '')).includes(trackId);
  });
  const itemId = String(
    match?.meta?.itemId ||
    match?.attributes?.itemId ||
    match?.relationships?.item?.data?.meta?.itemId ||
    match?.id ||
    ''
  );
  if (!itemId) {
    console.warn('[tidalAccountService] Could not find TIDAL playlist itemId for track removal:', { playlistId, trackId });
    return;
  }

  const response = await fetch(
    `${TIDAL_API_URL}/playlists/${encodeURIComponent(playlistId)}/relationships/items?countryCode=US`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: [{ type: 'tracks', id: trackId, meta: { itemId } }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TIDAL playlist removal failed (${response.status} ${response.statusText}): ${await response.text()}`);
  }
}

async function loadTidalAccountFromFirestore(): Promise<TidalAccountData> {
  const snap = await getDoc(getTidalDocRef());
  if (!snap.exists()) return { connected: false };
  return snap.data() as TidalAccountData;
}

async function saveTidalAccount(data: TidalAccountData): Promise<void> {
  const updatedAt = Date.now();
  const payload = { ...data, updatedAt };
  await setDoc(getTidalDocRef(), payload, { merge: true });
  await AsyncStorage.setItem(TIDAL_CACHE_KEY, JSON.stringify(payload));
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

export async function refreshTidalConnectionIfNeeded(data?: TidalAccountData): Promise<TidalAccountData> {
  const account = data || await getTidalAccountData();
  if (!account.connected || !account.tokenSet) return account;

  if (Date.now() < account.tokenSet.expiresAt - 60_000) {
    return account;
  }

  const tokenSet = await refreshAccessToken(account.tokenSet.refreshToken);
  const playlists = await fetchOwnedPlaylists(tokenSet.accessToken, account.userId);
  const updated: TidalAccountData = {
    ...account,
    tokenSet,
    playlists,
    lastSyncedAt: Date.now(),
    connected: true,
  };
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
      } catch (error) {
        console.warn('[tidalAccountService] Failed to remove track from configured TIDAL playlist:', previousPlaylistId, error);
      }
    }

    if (!playlistId) return;

    await addTrackToPlaylist(playlistId, track.id, accessToken);
    await saveTidalAccount({
      ...account,
      lastSyncedAt: Date.now(),
    });
  } catch (error) {
    console.error('[tidalAccountService] Failed to sync track to TIDAL playlist:', error);
  }
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
