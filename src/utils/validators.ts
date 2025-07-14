// src/utils/validators.ts
// Zod validation schemas for API responses and data validation
import { z } from 'zod';

// === HELPER SCHEMAS ===

// ID schema that accepts both string and number, converts to string
const IdSchema = z.union([z.string(), z.number()]).transform(val => String(val));

// === DEEZER API VALIDATION SCHEMAS ===

// Artist schema for Deezer API responses
export const DeezerArtistSchema = z.object({
  id: IdSchema,
  name: z.string(),
  picture: z.string(),
  picture_small: z.string(),
  picture_medium: z.string(),
});

// Album schema for Deezer API responses
export const DeezerAlbumSchema = z.object({
  id: IdSchema,
  title: z.string(),
  cover: z.string(),
  cover_small: z.string(),
  cover_medium: z.string(),
  cover_big: z.string(),
  release_date: z.string(),
});

// Track schema for Deezer API responses
export const DeezerTrackSchema = z.object({
  id: IdSchema,
  title: z.string(),
  title_short: z.string(),
  artist: DeezerArtistSchema,
  album: DeezerAlbumSchema,
  duration: z.number().min(0),
  preview: z.string(),
  rank: z.number(),
  track_position: z.number().optional(),
  disk_number: z.number().optional(),
  release_date: z.string().optional(),
});

// Search response schema
export const DeezerSearchResponseSchema = z.object({
  data: z.array(DeezerTrackSchema),
  total: z.number(),
  next: z.string().optional(),
});

// Album search response schema
export const DeezerAlbumSearchResponseSchema = z.object({
  data: z.array(DeezerAlbumSchema.extend({
    artist: DeezerArtistSchema,
    tracks: z.object({
      data: z.array(DeezerTrackSchema),
    }).optional(),
  })),
  total: z.number(),
  next: z.string().optional(),
});

// === SAVED MUSIC VALIDATION SCHEMAS ===

// Schema for validating saved music data before saving to Firebase
export const SavedMusicInputSchema = z.object({
  id: IdSchema,
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  artistId: IdSchema,
  album: z.string().min(1, 'Album is required'),
  albumId: IdSchema,
  coverUrl: z.string(),
  preview: z.string(),
  duration: z.number().min(1, 'Duration must be greater than 0'),
  rating: z.number().min(0).max(10).refine(
    (val) => val % 0.5 === 0, 
    'Rating must be in 0.5 increments (0, 0.5, 1, 1.5, ..., 10)'
  ),
  releaseDate: z.string(),
  trackPosition: z.number().min(0),
  diskNumber: z.number().min(1),
  savedAt: z.date(),
});

// Schema for validating Firebase document data
export const FirebaseMusicDocumentSchema = SavedMusicInputSchema.extend({
  firebaseId: z.string().optional(),
  source: z.string().optional(), // Handle legacy "source" field
});

// === FLEXIBLE SCHEMAS FOR API RESPONSES ===
// These schemas handle the reality that some API fields might be missing

export const FlexibleDeezerArtistSchema = z.object({
  id: IdSchema,
  name: z.string(),
  picture: z.string().default(''),
  picture_small: z.string().default(''),
  picture_medium: z.string().default(''),
});

export const FlexibleDeezerAlbumSchema = z.object({
  id: IdSchema,
  title: z.string(),
  cover: z.string().default(''),
  cover_small: z.string().default(''),
  cover_medium: z.string(),
  cover_big: z.string().default(''),
  release_date: z.string().default(''),
});

export const FlexibleDeezerTrackSchema = z.object({
  id: IdSchema,
  title: z.string(),
  title_short: z.string().default('').transform(val => val || ''),
  artist: FlexibleDeezerArtistSchema,
  album: FlexibleDeezerAlbumSchema.optional(), // 🔧 MAKE ALBUM OPTIONAL
  duration: z.number().min(0),
  preview: z.string(),
  rank: z.number().default(0),
  track_position: z.number().optional(),
  disk_number: z.number().optional(),
  release_date: z.string().optional(),
});

// === UTILITY VALIDATION FUNCTIONS ===

// Validate and parse Deezer track response with flexible schema
export function validateDeezerTrack(data: unknown): z.infer<typeof DeezerTrackSchema> {
  try {
    // Use flexible schema for parsing, but return as strict type
    const flexibleResult = FlexibleDeezerTrackSchema.parse(data);
    
    // 🔧 CREATE DEFAULT ALBUM IF MISSING
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
    
    // Transform to match strict interface
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

// Validate and parse Deezer search response
export function validateDeezerSearchResponse(data: unknown): z.infer<typeof DeezerSearchResponseSchema> {
  try {
    // Parse with flexible schema first
    const rawData = data as any;
    
    // 🔧 FILTER OUT TRACKS WITH MISSING ESSENTIAL DATA
    const validTracks = (rawData.data || [])
      .map((track: unknown) => {
        try {
          return validateDeezerTrack(track);
        } catch (error) {
          console.warn('Skipping invalid track:', error);
          return null;
        }
      })
      .filter((track: any): track is z.infer<typeof DeezerTrackSchema> => track !== null);
    
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

// Validate and parse Deezer album search response
export function validateDeezerAlbumSearchResponse(data: unknown): z.infer<typeof DeezerAlbumSearchResponseSchema> {
  try {
    const rawData = data as any;
    
    // 🔧 IMPROVED ERROR HANDLING FOR ALBUMS
    const validAlbums = (rawData.data || [])
      .map((album: any) => {
        try {
          const flexibleAlbum = FlexibleDeezerAlbumSchema.parse(album);
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

// Validate saved music input before saving to Firebase
export function validateSavedMusicInput(data: unknown): z.infer<typeof SavedMusicInputSchema> {
  try {
    return SavedMusicInputSchema.parse(data);
  } catch (error) {
    console.error('Invalid saved music data:', error);
    throw new Error(`Invalid music data: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

// Validate Firebase document data
export function validateFirebaseMusicDocument(data: unknown): z.infer<typeof FirebaseMusicDocumentSchema> {
  try {
    return FirebaseMusicDocumentSchema.parse(data);
  } catch (error) {
    console.error('Invalid Firebase document data:', error);
    throw new Error(`Invalid document data: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

// === SAFE PARSING FUNCTIONS (returns null on error) ===

export function safeParseDeezerTrack(data: unknown): z.infer<typeof DeezerTrackSchema> | null {
  try {
    return validateDeezerTrack(data);
  } catch (error) {
    console.warn('Failed to parse Deezer track:', error);
    return null;
  }
}

export function safeParseDeezerSearchResponse(data: unknown): z.infer<typeof DeezerSearchResponseSchema> | null {
  try {
    return validateDeezerSearchResponse(data);
  } catch (error) {
    console.warn('Failed to parse Deezer search response:', error);
    return null;
  }
}

export function safeParseFirebaseMusicDocument(data: unknown): z.infer<typeof FirebaseMusicDocumentSchema> | null {
  const result = FirebaseMusicDocumentSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Failed to parse Firebase document:', result.error);
  return null;
}

// === TYPE EXPORTS ===

// Export inferred types for use throughout the app
export type ValidatedDeezerTrack = z.infer<typeof DeezerTrackSchema>;
export type ValidatedDeezerSearchResponse = z.infer<typeof DeezerSearchResponseSchema>;
export type ValidatedDeezerAlbumSearchResponse = z.infer<typeof DeezerAlbumSearchResponseSchema>;
export type ValidatedSavedMusicInput = z.infer<typeof SavedMusicInputSchema>;
export type ValidatedFirebaseMusicDocument = z.infer<typeof FirebaseMusicDocumentSchema>;