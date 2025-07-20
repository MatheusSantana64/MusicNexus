// src/utils/validators/deezerValidators.ts
// This file contains validation schemas and utility functions for Deezer API responses using Zod.
import { z } from 'zod';

// === HELPER SCHEMAS ===
const IdSchema = z.union([z.string(), z.number()]).transform(val => String(val));

// === DEEZER API VALIDATION SCHEMAS ===
export const DeezerArtistSchema = z.object({
  id: IdSchema,
  name: z.string(),
  picture: z.string(),
  picture_small: z.string(),
  picture_medium: z.string(),
});

export const MusicAlbumSchema = z.object({
  id: IdSchema,
  title: z.string(),
  cover: z.string(),
  cover_small: z.string(),
  cover_medium: z.string(),
  cover_big: z.string(),
  release_date: z.string(),
});

export const MusicTrackSchema = z.object({
  id: IdSchema,
  title: z.string(),
  title_short: z.string(),
  artist: DeezerArtistSchema,
  album: MusicAlbumSchema,
  duration: z.number().min(0),
  preview: z.string(),
  rank: z.number(),
  track_position: z.number().optional(),
  disk_number: z.number().optional(),
  release_date: z.string().optional(),
});

export const MusicSearchResponseSchema = z.object({
  data: z.array(MusicTrackSchema),
  total: z.number(),
  next: z.string().optional(),
});

export const MusicAlbumSearchResponseSchema = z.object({
  data: z.array(MusicAlbumSchema.extend({
    artist: DeezerArtistSchema,
    tracks: z.object({
      data: z.array(MusicTrackSchema),
    }).optional(),
  })),
  total: z.number(),
  next: z.string().optional(),
});

// === FLEXIBLE SCHEMAS FOR API RESPONSES ===
export const FlexibleDeezerArtistSchema = z.object({
  id: IdSchema,
  name: z.string(),
  picture: z.string().default(''),
  picture_small: z.string().default(''),
  picture_medium: z.string().default(''),
});

export const FlexibleMusicAlbumSchema = z.object({
  id: IdSchema,
  title: z.string(),
  cover: z.string().default(''),
  cover_small: z.string().default(''),
  cover_medium: z.string(),
  cover_big: z.string().default(''),
  release_date: z.string().default(''),
});

export const FlexibleMusicTrackSchema = z.object({
  id: IdSchema,
  title: z.string(),
  title_short: z.string().default('').transform(val => val || ''),
  artist: FlexibleDeezerArtistSchema,
  album: FlexibleMusicAlbumSchema.optional(),
  duration: z.number().min(0),
  preview: z.string(),
  rank: z.number().default(0),
  track_position: z.number().optional(),
  disk_number: z.number().optional(),
  release_date: z.string().optional(),
});

// === UTILITY VALIDATION FUNCTIONS ===
export function validateMusicTrack(data: unknown): z.infer<typeof MusicTrackSchema> {
  try {
    const flexibleResult = FlexibleMusicTrackSchema.parse(data);
    const defaultAlbum = {
      id: 'unknown',
      title: 'Unknown Album',
      cover: '',
      cover_small: '',
      cover_medium: '',
      cover_big: '',
      release_date: '',
    };
    const album = flexibleResult.album || defaultAlbum;
    return {
      id: flexibleResult.id,
      title: flexibleResult.title,
      title_short: flexibleResult.title_short || flexibleResult.title,
      artist: {
        id: flexibleResult.artist.id,
        name: flexibleResult.artist.name,
        picture: flexibleResult.artist.picture || flexibleResult.artist.picture_medium || '',
        picture_small: flexibleResult.artist.picture_small || flexibleResult.artist.picture_medium || '',
        picture_medium: flexibleResult.artist.picture_medium || '',
      },
      album: {
        id: album.id,
        title: album.title,
        cover: album.cover || album.cover_medium,
        cover_small: album.cover_small || album.cover_medium,
        cover_medium: album.cover_medium,
        cover_big: album.cover_big || album.cover_medium,
        release_date: album.release_date,
      },
      duration: flexibleResult.duration,
      preview: flexibleResult.preview,
      rank: flexibleResult.rank,
      track_position: flexibleResult.track_position,
      disk_number: flexibleResult.disk_number,
      release_date: flexibleResult.release_date,
    };
  } catch (error) {
    console.error('Invalid Deezer track data:', error);
    throw new Error(`Invalid track data: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

export function validateMusicSearchResponse(data: unknown): z.infer<typeof MusicSearchResponseSchema> {
  try {
    const rawData = data as any;
    const validTracks = (rawData.data || [])
      .map((track: unknown) => {
        try {
          return validateMusicTrack(track);
        } catch (error) {
          console.warn('Skipping invalid track:', error);
          return null;
        }
      })
      .filter((track: any): track is z.infer<typeof MusicTrackSchema> => track !== null);
    return {
      data: validTracks,
      total: rawData.total || 0,
      next: rawData.next,
    };
  } catch (error) {
    console.error('Invalid Deezer search response:', error);
    throw new Error(`Invalid search response: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

export function validateMusicAlbumSearchResponse(data: unknown): z.infer<typeof MusicAlbumSearchResponseSchema> {
  try {
    const rawData = data as any;
    const validAlbums = (rawData.data || [])
      .map((album: any) => {
        try {
          const flexibleAlbum = FlexibleMusicAlbumSchema.parse(album);
          const flexibleArtist = FlexibleDeezerArtistSchema.parse(album.artist || {
            id: 'unknown',
            name: 'Unknown Artist',
            picture: '',
            picture_small: '',
            picture_medium: '',
          });
          return {
            id: flexibleAlbum.id,
            title: flexibleAlbum.title,
            cover: flexibleAlbum.cover || flexibleAlbum.cover_medium,
            cover_small: flexibleAlbum.cover_small || flexibleAlbum.cover_medium,
            cover_medium: flexibleAlbum.cover_medium,
            cover_big: flexibleAlbum.cover_big || flexibleAlbum.cover_medium,
            release_date: flexibleAlbum.release_date,
            artist: {
              id: flexibleArtist.id,
              name: flexibleArtist.name,
              picture: flexibleArtist.picture || flexibleArtist.picture_medium || '',
              picture_small: flexibleArtist.picture_small || flexibleArtist.picture_medium || '',
              picture_medium: flexibleArtist.picture_medium || '',
            },
            tracks: album.tracks,
          };
        } catch (error) {
          console.warn('Skipping invalid album:', error);
          return null;
        }
      })
      .filter((album: any): album is any => album !== null);
    return {
      data: validAlbums,
      total: rawData.total || 0,
      next: rawData.next,
    };
  } catch (error) {
    console.error('Invalid Deezer album search response:', error);
    throw new Error(`Invalid album search response: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

export function safeParseMusicTrack(data: unknown): z.infer<typeof MusicTrackSchema> | null {
  try {
    return validateMusicTrack(data);
  } catch (error) {
    console.warn('Failed to parse Deezer track:', error);
    return null;
  }
}

export function safeParseMusicSearchResponse(data: unknown): z.infer<typeof MusicSearchResponseSchema> | null {
  try {
    return validateMusicSearchResponse(data);
  } catch (error) {
    console.warn('Failed to parse Deezer search response:', error);
    return null;
  }
}

// === TYPE EXPORTS ===
export type ValidatedMusicTrack = z.infer<typeof MusicTrackSchema>;
export type ValidatedMusicSearchResponse = z.infer<typeof MusicSearchResponseSchema>;
export type ValidatedMusicAlbumSearchResponse = z.infer<typeof MusicAlbumSearchResponseSchema>;