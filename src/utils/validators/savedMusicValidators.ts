// src/utils/validators/savedMusicValidators.ts
// This module provides validation schemas for saved music data using Zod.
import { z } from 'zod';

// === HELPER SCHEMAS ===
const IdSchema = z.union([z.string(), z.number()]).transform(val => String(val));

// Schema for rating history entries
const RatingHistoryEntrySchema = z.object({
  rating: z.number(),
  timestamp: z.string(),
});

// Schema for validating saved music data before saving to Firebase
export const SavedMusicInputSchema = z.object({
  id: IdSchema,
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  artistId: IdSchema,
  album: z.string().min(1, 'Album is required'),
  albumId: IdSchema,
  coverUrl: z.string(),
  duration: z.number().min(1, 'Duration must be greater than 0'),
  rating: z.number().min(0).max(10).refine(
    (val) => val % 0.5 === 0, 
    'Rating must be in 0.5 increments (0, 0.5, 1, 1.5, ..., 10)'
  ),
  releaseDate: z.string(),
  trackPosition: z.number().min(0),
  diskNumber: z.number().min(1),
  savedAt: z.date(),
  tags: z.array(z.string()).default([]),
  ratingHistory: z.array(RatingHistoryEntrySchema).optional(),
});

// Schema for validating Firebase document data
export const FirebaseMusicDocumentSchema = SavedMusicInputSchema.extend({
  firebaseId: z.string().optional(),
});

// === UTILITY VALIDATION FUNCTIONS ===
export function validateSavedMusicInput(data: unknown): z.infer<typeof SavedMusicInputSchema> {
  try {
    return SavedMusicInputSchema.parse(data);
  } catch (error) {
    console.error('Invalid saved music data:', error);
    throw new Error(`Invalid music data: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
  }
}

export function validateFirebaseMusicDocument(data: unknown): z.infer<typeof FirebaseMusicDocumentSchema> {
  try {
    return FirebaseMusicDocumentSchema.parse(data);
  } catch (error) {
    console.error('Invalid Firebase document data:', error);
    throw new Error(`Invalid document data: ${error instanceof z.ZodError ? error.message : 'Unknown validation error'}`);
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
export type ValidatedSavedMusicInput = z.infer<typeof SavedMusicInputSchema>;
export type ValidatedFirebaseMusicDocument = z.infer<typeof FirebaseMusicDocumentSchema>;