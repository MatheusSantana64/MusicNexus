// src/services/tidal/tidalAccountService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
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

function extractResourceArray(document: any): any[] {
  if (Array.isArray(document?.data)) return document.data;
  if (document?.data) return [document.data];
  return [];
}

function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'musicnexus',
    path: 'tidal-auth',
  });
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

async function fetchOwnedPlaylists(token: string): Promise<TidalPlaylistSummary[]> {
  const endpoints = [
    `${TIDAL_API_URL}/users/me/relationships/playlists?countryCode=US&include=coverArt,owners`,
    `${TIDAL_API_URL}/playlists?countryCode=US&include=coverArt,owners`,
  ];

  for (const endpoint of endpoints) {
    try {
      const document = await fetchJson(endpoint, token);
      const playlists = extractResourceArray(document);
      if (playlists.length === 0) continue;

      return playlists.map(playlist => ({
        id: String(playlist.id || ''),
        title: String(playlist.attributes?.title || playlist.attributes?.name || ''),
        numberOfTracks: Number(playlist.attributes?.numberOfTracks || playlist.attributes?.trackCount || 0) || undefined,
        description: normalizePlaylistDescription(playlist.attributes?.description),
        imageUrl: playlist.attributes?.images?.[0]?.url || playlist.attributes?.imageUrl || playlist.attributes?.image?.url,
        ownerName: playlist.attributes?.ownerName || playlist.attributes?.creatorName,
      })).filter(item => item.id && item.title);
    } catch (error) {
      console.warn('[tidalAccountService] Playlist fetch failed for endpoint:', endpoint, error);
    }
  }

  return [];
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
  const playlists = await fetchOwnedPlaylists(tokenSet.accessToken);
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

export async function disconnectTidalAccount(): Promise<void> {
  await setDoc(getTidalDocRef(), { connected: false, playlists: [], tokenSet: null, updatedAt: Date.now() }, { merge: true });
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
    scopes: ['r_playlists', 'w_playlists', 'r_user_profile'],
    redirectUri: getRedirectUri(),
    usePKCE: true,
  };
}

export async function finalizeTidalAuthorization(code: string, codeVerifier?: string): Promise<TidalAccountData> {
  const { clientId } = getTidalConfig();
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri: getRedirectUri(),
      codeVerifier,
    },
    TIDAL_DISCOVERY
  );
  if (!tokenResponse.accessToken) {
    throw new Error('TIDAL token exchange response was incomplete');
  }
  const tokenSet: TidalTokenSet = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken || '',
    expiresAt: Date.now() + (Number(tokenResponse.expiresIn) || 3600) * 1000,
    scope: tokenResponse.scope,
    tokenType: tokenResponse.tokenType,
  };
  const me = await getMe(tokenSet.accessToken);
  const playlists = await fetchOwnedPlaylists(tokenSet.accessToken);
  const data: TidalAccountData = {
    connected: true,
    tokenSet,
    userId: me.id,
    displayName: me.displayName,
    playlists,
    lastSyncedAt: Date.now(),
  };
  await saveTidalAccount(data);
  return data;
}
