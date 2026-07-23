// src/services/tidal/tidalApiClient.ts
// TIDAL catalog search client using the official JSON:API response format.
import Constants from 'expo-constants';
import { MusicTrack } from '../../types';

const TIDAL_API_URL = 'https://openapi.tidal.com/v2';
const TIDAL_TOKEN_URL = 'https://auth.tidal.com/v1/oauth2/token';
const TIDAL_COUNTRY_CODE = 'US';

let tidalAccessToken: string | null = null;
let tokenExpiresAt = 0;

function getTidalCredentials() {
  const extra = Constants.expoConfig?.extra || {};
  return {
    clientId: extra.EXPO_PUBLIC_TIDAL_CLIENT_ID,
    clientSecret: extra.EXPO_PUBLIC_TIDAL_CLIENT_SECRET,
  };
}

export async function getTidalAccessToken(): Promise<string> {
  if (tidalAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return tidalAccessToken;
  }

  const { clientId, clientSecret } = getTidalCredentials();
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(TIDAL_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`TIDAL authentication failed: ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('TIDAL authentication response did not contain an access token');
  }

  tidalAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in) || 86_400) * 1000;
  return tidalAccessToken!;
}

function parseDuration(duration: unknown): number {
  if (typeof duration !== 'string') return 0;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return 0;
  return Math.max(
    1,
    Math.floor(
      (Number(match[1] || 0) * 3600) +
      (Number(match[2] || 0) * 60) +
      Number(match[3] || 0)
    )
  );
}

type TidalResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, {
    data?: TidalResource | TidalResource[];
    links?: { next?: string };
  }>;
};

type TidalSearchDocument = {
  data?: TidalResource;
  included?: TidalResource[];
};

type TidalCollectionDocument = {
  data?: TidalResource[];
  included?: TidalResource[];
  links?: { next?: string };
};

function findIncluded(
  document: TidalSearchDocument,
  type: string,
  id: string
): TidalResource | undefined {
  const matches = document.included?.filter(
    resource => resource.type === type && resource.id === id
  ) || [];

  // Search and detail responses can contain duplicate resources. Prefer the
  // detail resource because it carries relationships such as coverArt.
  return matches.find(resource => resource.relationships) || matches[0];
}

function firstRelation(
  resource: TidalResource | undefined,
  relationship: string
): TidalResource | undefined {
  const data = resource?.relationships?.[relationship]?.data;
  return Array.isArray(data) ? data[0] : data;
}

function artworkUrl(
  document: { included?: TidalResource[] },
  owner: TidalResource | undefined,
  relationship: string,
  preferredWidth: number
): string {
  const artworkRef = firstRelation(owner, relationship);
  const artwork = document.included?.find(
    resource => resource.type === 'artworks' && resource.id === artworkRef?.id
  );
  const files = Array.isArray(artwork?.attributes?.files)
    ? artwork.attributes.files as Array<{ href?: string; meta?: { width?: number; height?: number } }>
    : [];

  return files
    .filter(file => typeof file.href === 'string' && file.href.length > 0)
    .sort((a, b) =>
      Math.abs(Number(a.meta?.width || 0) - preferredWidth) -
      Math.abs(Number(b.meta?.width || 0) - preferredWidth)
    )[0]?.href || '';
}

function toMusicTrack(
  resource: TidalResource,
  document: { included?: TidalResource[] }
): MusicTrack | null {
  if (!resource.id || resource.type !== 'tracks') return null;

  const attributes = resource.attributes || {};
  const albumRef = firstRelation(resource, 'albums');
  const artistRef = firstRelation(resource, 'artists');
  const album = findIncluded(document, 'albums', albumRef?.id || '');
  const artist = findIncluded(document, 'artists', artistRef?.id || '');
  const albumAttributes = album?.attributes || {};
  const artistAttributes = artist?.attributes || {};
  const duration = parseDuration(attributes.duration);
  const albumCover = artworkUrl(document, album, 'coverArt', 640);
  const artistPicture = artworkUrl(document, artist, 'profileArt', 320);

  return {
    // TIDAL IDs are opaque and stable; retain the catalog ID for future playlist sync.
    id: resource.id,
    title: String(attributes.title || ''),
    title_short: String(attributes.title || ''),
    artist: {
      id: artist?.id || artistRef?.id || '',
      name: String(artistAttributes.name || ''),
      picture: artistPicture,
      picture_small: artistPicture,
      picture_medium: artistPicture,
    },
    album: {
      id: album?.id || albumRef?.id || '',
      title: String(albumAttributes.title || ''),
      cover: albumCover,
      cover_small: albumCover,
      cover_medium: albumCover,
      cover_big: albumCover,
      release_date: String(albumAttributes.releaseDate || ''),
    },
    duration,
    rank: Math.round(Number(attributes.popularity || 0) * 1000),
    track_position: Number(attributes.trackNumber || 0) || undefined,
    disk_number: Number(attributes.volumeNumber || 0) || undefined,
    release_date: String(albumAttributes.releaseDate || ''),
  };
}

async function fetchTidalCollection(
  path: string,
  token: string
): Promise<TidalCollectionDocument> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${TIDAL_API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    });

    if (response.ok) {
      return response.json() as Promise<TidalCollectionDocument>;
    }

    const message = await response.text();
    const isTransient = response.status === 429 || response.status >= 500;
    if (!isTransient || attempt === maxAttempts) {
      throw new Error(
        `TIDAL metadata request failed (${response.status} ${response.statusText}): ${message || 'empty response'}`
      );
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : attempt * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('TIDAL metadata request failed after retries');
}

function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

async function fetchTidalResourcesByIds(
  resourceType: 'tracks' | 'albums' | 'artists',
  ids: string[],
  include: string,
  token: string
): Promise<TidalCollectionDocument> {
  const uniqueIds = [...new Set(ids)];
  const documents: TidalCollectionDocument[] = [];
  for (const batch of splitIntoBatches(uniqueIds, 20)) {
    documents.push(await fetchTidalCollection(
      `/${resourceType}?filter%5Bid%5D=${encodeURIComponent(batch.join(','))}&countryCode=${TIDAL_COUNTRY_CODE}&include=${include}`,
      token
    ));
  }

  return {
    data: documents.flatMap(document => document.data || []),
    included: documents.flatMap(document => document.included || []),
  };
}

async function enrichTidalTracks(
  trackResources: TidalResource[],
  document: TidalSearchDocument,
  token: string,
  limit: number
): Promise<MusicTrack[]> {
  const trackIds = [...new Set(trackResources.map(track => track.id))].slice(0, limit);
  if (trackIds.length === 0) return [];

  const trackDocument = await fetchTidalResourcesByIds(
    'tracks',
    trackIds,
    'albums,artists',
    token
  );
  const fetchedTracks = trackDocument.data || [];
  const albumIds = fetchedTracks
    .map(track => firstRelation(track, 'albums')?.id)
    .filter((id): id is string => Boolean(id));
  const artistIds = fetchedTracks
    .map(track => firstRelation(track, 'artists')?.id)
    .filter((id): id is string => Boolean(id));

  const [albumDocument, artistDocument] = await Promise.all([
    albumIds.length > 0
      ? fetchTidalResourcesByIds('albums', albumIds, 'coverArt,artists', token)
      : Promise.resolve({ data: [], included: [] }),
    artistIds.length > 0
      ? fetchTidalResourcesByIds('artists', artistIds, 'profileArt', token)
      : Promise.resolve({ data: [], included: [] }),
  ]);
  const enrichedDocument = {
    ...document,
    included: [
      ...(document.included || []),
      ...(trackDocument.included || []),
      ...(trackDocument.data || []),
      ...(albumDocument.data || []),
      ...(albumDocument.included || []),
      ...(artistDocument.data || []),
      ...(artistDocument.included || []),
    ],
  };

  const fetchedById = new Map(fetchedTracks.map(track => [track.id, track]));
  return trackResources
    .map(track => fetchedById.get(track.id))
    .filter((track): track is TidalResource => track !== undefined)
    .map(track => toMusicTrack(track, enrichedDocument))
    .filter((track): track is MusicTrack => track !== null && track.duration > 0);
}

export async function searchTidalTracks(
  query: string,
  limit: number = 25,
  albumMode = false
): Promise<MusicTrack[]> {
  const token = await getTidalAccessToken();
  const encodedQuery = encodeURIComponent(query.trim());
  const include = albumMode ? 'albums' : 'tracks';
  const response = await fetch(
    `${TIDAL_API_URL}/searchResults/${encodedQuery}?countryCode=${TIDAL_COUNTRY_CODE}&explicitFilter=INCLUDE&include=${include}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`TIDAL search failed: ${await response.text()}`);
  }

  const document = await response.json() as TidalSearchDocument;
  const rootRelationships = document.data?.relationships || {};

  if (albumMode) {
    const albumRefs = rootRelationships.albums?.data;
    const albumIds = (Array.isArray(albumRefs) ? albumRefs : [])
      .map(album => album.id)
      .filter(Boolean);
    const albumSearchIncluded = [...(document.included || [])];
    const desiredAlbumCount = Math.max(3, Math.ceil(limit / 12));
    let nextAlbumPage = rootRelationships.albums?.links?.next;
    let albumPages = 1;

    while (nextAlbumPage && albumIds.length < desiredAlbumCount && albumPages < 10) {
      const nextDocument = await fetchTidalCollection(nextAlbumPage, token);
      albumIds.push(...(nextDocument.data || []).map(album => album.id).filter(Boolean));
      albumSearchIncluded.push(...(nextDocument.included || []));
      nextAlbumPage = nextDocument.links?.next;
      albumPages += 1;
    }

    const uniqueAlbumIds = [...new Set(albumIds)];
    const albumDates = new Map(
      albumSearchIncluded
        .filter(resource => resource.type === 'albums')
        .map(album => [album.id, String(album.attributes?.releaseDate || '')])
    );
    uniqueAlbumIds.sort((a, b) =>
      (albumDates.get(b) || '').localeCompare(albumDates.get(a) || '')
    );
    // Album searches are primarily used to find an artist's newest release.
    // Expand only a small recent-album window initially; loadMore increases
    // this window without expanding all search results at once.
    const albumWindow = Math.min(uniqueAlbumIds.length, desiredAlbumCount);
    const selectedAlbumIds = uniqueAlbumIds.slice(0, albumWindow);
    if (selectedAlbumIds.length === 0) return [];

    const albumDocument = await fetchTidalResourcesByIds(
      'albums',
      selectedAlbumIds,
      'items,coverArt,artists',
      token
    );
    const albumResources = albumDocument.data || [];
    const includedTracks = albumDocument.included?.filter(resource => resource.type === 'tracks') || [];
    const includedById = new Map(includedTracks.map(track => [track.id, track]));
    const orderedTracks: TidalResource[] = [];

    for (const album of albumResources) {
      const items = album.relationships?.items?.data;
      for (const item of Array.isArray(items) ? items : []) {
        const track = includedById.get(item.id);
        if (track) orderedTracks.push(track);
      }
    }

    return enrichTidalTracks(
      orderedTracks,
      {
        ...document,
        included: [
          ...(document.included || []),
          ...(albumDocument.data || []),
          ...(albumDocument.included || []),
        ],
      },
      token,
      orderedTracks.length
    );
  }

  const tracksRelationship = document.data?.relationships?.tracks?.data;
  const tracks = Array.isArray(tracksRelationship) ? tracksRelationship : [];
  const allTrackRefs = [...tracks];
  let next = rootRelationships.tracks?.links?.next;
  let pages = 1;
  while (next && allTrackRefs.length < limit && pages < 10) {
    const nextDocument = await fetchTidalCollection(next, token);
    allTrackRefs.push(...(nextDocument.data || []));
    next = nextDocument.links?.next;
    pages += 1;
  }

  return enrichTidalTracks(allTrackRefs, document, token, limit);
}
