// src/services/spotify/spotifyApiClient.ts
// Spotify API client for fetching tracks and albums
import { MusicTrack, MusicAlbum } from '../../types';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

let spotifyAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  spotifyAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return spotifyAccessToken!;
}

export async function searchSpotifyTrack(title: string, artist?: string): Promise<MusicTrack | null> {
  if (/^\d+$/.test(title.trim())) {
    return null;
  }

  // Use Spotify's recommended query format
  let query = `track:"${title.trim()}"`;
  if (artist && artist.trim().length > 0) {
    query += ` artist:"${artist.trim()}"`;
  }

  const token = await getSpotifyAccessToken();
  const response = await fetch(`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error('Spotify API error:', await response.text());
    return null;
  }

  const data = await response.json();
  const track = data.tracks?.items?.[0];
  if (!track) return null;

  // Map Spotify track to MusicTrack-like object
  return {
    id: track.id,
    title: track.name,
    title_short: track.name,
    artist: {
      id: track.artists[0].id,
      name: track.artists[0].name,
      picture: '',
      picture_small: '',
      picture_medium: '',
    },
    album: {
      id: track.album.id,
      title: track.album.name,
      cover: track.album.images[0]?.url || '',
      cover_small: track.album.images[2]?.url || '',
      cover_medium: track.album.images[1]?.url || '',
      cover_big: track.album.images[0]?.url || '',
      release_date: track.album.release_date,
    },
    duration: Math.floor(track.duration_ms / 1000),
    preview: track.preview_url || '',
    rank: 0,
    track_position: track.track_number,
    disk_number: track.disc_number,
    release_date: track.album.release_date,
  };
}

export async function searchSpotifyArtistTracks(artistName: string, limit: number = 10): Promise<MusicTrack[]> {
  const token = await getSpotifyAccessToken();
  // Step 1: Search for artist ID
  const artistRes = await fetch(`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const artistData = await artistRes.json();
  const artist = artistData.artists?.items?.[0];
  if (!artist) return [];

  // Step 2: Get artist's top tracks
  const tracksRes = await fetch(`${SPOTIFY_API_URL}/artists/${artist.id}/top-tracks?market=US`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const tracksData = await tracksRes.json();
  return (tracksData.tracks || []).map((track: any) => ({
    id: track.id,
    title: track.name,
    title_short: track.name,
    artist: {
      id: artist.id,
      name: artist.name,
      picture: artist.images?.[0]?.url || '',
      picture_small: artist.images?.[2]?.url || '',
      picture_medium: artist.images?.[1]?.url || '',
    },
    album: {
      id: track.album.id,
      title: track.album.name,
      cover: track.album.images[0]?.url || '',
      cover_small: track.album.images[2]?.url || '',
      cover_medium: track.album.images[1]?.url || '',
      cover_big: track.album.images[0]?.url || '',
      release_date: track.album.release_date,
    },
    duration: Math.floor(track.duration_ms / 1000),
    preview: track.preview_url || '',
    rank: 0,
    track_position: track.track_number,
    disk_number: track.disc_number,
    release_date: track.album.release_date,
  }));
}

export interface SpotifyUnifiedSearchResult {
  tracks: MusicTrack[];
  albums: MusicAlbum[];
  artists: {
    id: string;
    name: string;
    picture: string;
  }[];
}

export async function spotifyUnifiedSearch(
  query: string,
  types: Array<'track' | 'album' | 'artist'> = ['track', 'album', 'artist'],
  limit: number = 10
): Promise<SpotifyUnifiedSearchResult> {
  const token = await getSpotifyAccessToken();
  const typeParam = types.join(',');
  const response = await fetch(
    `${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=${typeParam}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new Error('Spotify API error: ' + await response.text());
  }
  const data = await response.json();

  // Map tracks
  const tracks: MusicTrack[] = (data.tracks?.items || []).map((track: any) => ({
    id: track.id,
    title: track.name,
    title_short: track.name,
    artist: {
      id: track.artists[0].id,
      name: track.artists[0].name,
      picture: '',
      picture_small: '',
      picture_medium: '',
    },
    album: {
      id: track.album.id,
      title: track.album.name,
      cover: track.album.images[0]?.url || '',
      cover_small: track.album.images[2]?.url || '',
      cover_medium: track.album.images[1]?.url || '',
      cover_big: track.album.images[0]?.url || '',
      release_date: track.album.release_date,
    },
    duration: Math.floor(track.duration_ms / 1000),
    preview: track.preview_url || '',
    rank: 0,
    track_position: track.track_number,
    disk_number: track.disc_number,
    release_date: track.album.release_date,
  }));

  // Map albums
  const albums: MusicAlbum[] = (data.albums?.items || []).map((album: any) => ({
    id: album.id,
    title: album.name,
    cover: album.images[0]?.url || '',
    cover_small: album.images[2]?.url || '',
    cover_medium: album.images[1]?.url || '',
    cover_big: album.images[0]?.url || '',
    release_date: album.release_date,
    artist: {
      id: album.artists[0]?.id || '',
      name: album.artists[0]?.name || '',
      picture: '',
      picture_small: '',
      picture_medium: '',
    },
    tracks: undefined,
  }));

  // Map artists
  const artists = (data.artists?.items || []).map((artist: any) => ({
    id: artist.id,
    name: artist.name,
    picture: artist.images?.[0]?.url || '',
  }));

  return { tracks, albums, artists };
}