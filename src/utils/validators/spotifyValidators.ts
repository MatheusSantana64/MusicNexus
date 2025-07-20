// src/utils/validators/spotifyValidators.ts
// Zod validation schemas for Spotify API responses and data validation
import { z } from 'zod';

// === HELPER SCHEMAS ===

// ID schema that accepts both string and number, converts to string
const IdSchema = z.union([z.string(), z.number()]).transform(val => String(val));

// === SPOTIFY API VALIDATION SCHEMAS ===

// Artist schema for Spotify API responses
export const SpotifyArtistSchema = z.object({
  id: IdSchema,
  name: z.string(),
  picture: z.string().default(''),
  picture_small: z.string().default(''),
  picture_medium: z.string().default(''),
});

// Album schema for Spotify API responses
export const SpotifyAlbumSchema = z.object({
  id: IdSchema,
  title: z.string(),
  cover: z.string().default(''),
  cover_small: z.string().default(''),
  cover_medium: z.string().default(''),
  cover_big: z.string().default(''),
  release_date: z.string().default(''),
  artist: SpotifyArtistSchema,
  tracks: z.any().optional(),
});

// Track schema for Spotify API responses
export const SpotifyTrackSchema = z.object({
  id: IdSchema,
  title: z.string(),
  title_short: z.string().default('').transform(val => val || ''),
  artist: SpotifyArtistSchema,
  album: SpotifyAlbumSchema,
  duration: z.number().min(0),
  preview: z.string().default(''),
  rank: z.number().default(0),
  track_position: z.number().optional(),
  disk_number: z.number().optional(),
  release_date: z.string().optional(),
});

// Search response schema
export const SpotifySearchResponseSchema = z.object({
  tracks: z.array(SpotifyTrackSchema),
  albums: z.array(SpotifyAlbumSchema),
  artists: z.array(SpotifyArtistSchema),
});

// === UTILITY VALIDATION FUNCTIONS ===

export function validateSpotifyTrack(data: unknown): z.infer<typeof SpotifyTrackSchema> {
  try {
    return SpotifyTrackSchema.parse(data);
  } catch (error) {
    console.error('Invalid Spotify track data:', error);
    throw new Error(`Invalid track data: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

export function validateSpotifySearchResponse(data: unknown): z.infer<typeof SpotifySearchResponseSchema> {
  try {
    return SpotifySearchResponseSchema.parse(data);
  } catch (error) {
    console.error('Invalid Spotify search response:', error);
    throw new Error(`Invalid search response: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

export function safeParseSpotifyTrack(data: unknown): z.infer<typeof SpotifyTrackSchema> | null {
  try {
    return validateSpotifyTrack(data);
  } catch (error) {
    console.warn('Failed to parse Spotify track:', error);
    return null;
  }
}

export function safeParseSpotifySearchResponse(data: unknown): z.infer<typeof SpotifySearchResponseSchema> | null {
  try {
    return validateSpotifySearchResponse(data);
  } catch (error) {
    console.warn('Failed to parse Spotify search response:', error);
    return null;
  }
}

// === TYPE EXPORTS ===

export type ValidatedSpotifyTrack = z.infer<typeof SpotifyTrackSchema>;
export type ValidatedSpotifySearchResponse = z.infer<typeof SpotifySearchResponseSchema>;