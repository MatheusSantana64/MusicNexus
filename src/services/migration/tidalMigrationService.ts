// src/services/migration/tidalMigrationService.ts
// TIDAL Migration Service for migrating saved music from Spotify to TIDAL
import { SavedMusic } from '../../types/savedMusic';
import { MusicTrack } from '../../types/track';
import { searchTidalTracks } from '../tidal/tidalApiClient';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSavedMusicMeta } from '../firestoreMetaHelper';

export interface MigrationResult {
  success: boolean;
  originalTrack: SavedMusic;
  matchedTrack?: MusicTrack;
  error?: string;
}

export interface MigrationSummary {
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
  migrationLog: MigrationLogEntry[];
}

export interface MigrationLogEntry {
  originalTrack: SavedMusic;
  reason: string;
  timestamp: string;
  closestMatch?: MusicTrack;
  matchConfidence?: number;
}

export interface MigrationProgress {
  current: number;
  total: number;
  currentTrack: string;
  status: 'searching' | 'matching' | 'updating' | 'completed' | 'failed';
}

type ProgressCallback = (progress: MigrationProgress) => void;
type SummaryCallback = (summary: MigrationSummary) => void;

const TIDAL_ARTWORK_PREFIX = 'https://resources.tidal.com';

function normalizeMatchValue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\((?:[^()]*?)\)/g, ' ')
    .replace(/\[(?:[^[\]]*?)\]/g, ' ')
    .replace(/\s*-\s*(remaster|remastered|radio edit|edit|live|version|explicit|clean).*$/i, '')
    .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrailingNoise(value: string): string {
  return value
    .replace(/\((?:[^()]*?)\)\s*$/g, '')
    .replace(/\[(?:[^[\]]*?)\]\s*$/g, '')
    .replace(/\s*-\s*(remaster|remastered|radio edit|edit|live|version|explicit|clean).*$/i, '')
    .trim();
}

export function isAlreadyTidalTrack(track: SavedMusic): boolean {
  return track.coverUrl.trim().startsWith(TIDAL_ARTWORK_PREFIX);
}

/**
 * Build a search query for TIDAL from a SavedMusic track
 */
function buildTidalSearchQueries(track: SavedMusic): string[] {
  const title = track.title.trim();
  const artist = track.artist.trim();
  const album = track.album.trim();

  const normalizedTitle = normalizeMatchValue(title);
  const normalizedArtist = normalizeMatchValue(artist);
  const normalizedAlbum = normalizeMatchValue(album);
  const cleanedTitle = normalizeMatchValue(stripTrailingNoise(title));
  const cleanedArtist = normalizeMatchValue(stripTrailingNoise(artist));
  const cleanedAlbum = normalizeMatchValue(stripTrailingNoise(album));

  const queries = [
    `${title} ${artist}`.trim(),
    `${cleanedTitle} ${cleanedArtist}`.trim(),
    `${normalizedTitle} ${normalizedArtist}`.trim(),
    `${cleanedTitle} ${normalizedArtist}`.trim(),
    `${normalizedTitle} ${cleanedArtist}`.trim(),
    `${title} ${album}`.trim(),
    `${artist} ${album}`.trim(),
    `${cleanedTitle} ${cleanedAlbum}`.trim(),
    `${cleanedArtist} ${cleanedAlbum}`.trim(),
    `${normalizedTitle} ${normalizedAlbum}`.trim(),
    `${normalizedArtist} ${normalizedAlbum}`.trim(),
    `${normalizedTitle} ${normalizedArtist} ${normalizedAlbum}`.trim(),
  ];

  return [...new Set(queries.filter(Boolean))];
}

/**
 * Calculate match confidence between a saved track and a TIDAL track
 * Returns a score from 0-100
 */
function calculateMatchConfidence(savedTrack: SavedMusic, tidalTrack: MusicTrack): number {
  let score = 0;
  
  const savedTitle = normalizeMatchValue(savedTrack.title);
  const tidalTitle = normalizeMatchValue(tidalTrack.title);
  if (savedTitle === tidalTitle) {
    score += 45;
  } else if (savedTitle.includes(tidalTitle) || tidalTitle.includes(savedTitle)) {
    score += 22;
  }
  
  const savedArtist = normalizeMatchValue(savedTrack.artist);
  const tidalArtist = normalizeMatchValue(tidalTrack.artist.name);
  if (savedArtist === tidalArtist) {
    score += 30;
  } else if (savedArtist.includes(tidalArtist) || tidalArtist.includes(savedArtist)) {
    score += 15;
  }
  
  const savedAlbum = normalizeMatchValue(savedTrack.album);
  const tidalAlbum = normalizeMatchValue(tidalTrack.album.title);
  if (savedAlbum === tidalAlbum) {
    score += 15;
  } else if (savedAlbum.includes(tidalAlbum) || tidalAlbum.includes(savedAlbum)) {
    score += 8;
  }
  
  // Duration match (within 5 seconds = 10, within 10 seconds = 5)
  const durationDiff = Math.abs(savedTrack.duration - tidalTrack.duration);
  if (durationDiff <= 3) {
    score += 12;
  } else if (durationDiff <= 5) {
    score += 8;
  } else if (durationDiff <= 10) {
    score += 4;
  }
  
  // Track position match (5 points)
  if (savedTrack.trackPosition && tidalTrack.track_position && 
      savedTrack.trackPosition === tidalTrack.track_position) {
    score += 5;
  }
  
  // Disk number match (5 points)
  if (savedTrack.diskNumber && tidalTrack.disk_number && 
      savedTrack.diskNumber === tidalTrack.disk_number) {
    score += 5;
  }

  // Strong fallback when the album and track position line up.
  // This helps when titles differ because of language, punctuation, or
  // release-specific suffixes.
  const hasStrongAlbumMatch = savedAlbum && tidalAlbum && savedAlbum === tidalAlbum;
  const hasExactTrackPosition = Boolean(
    savedTrack.trackPosition &&
    tidalTrack.track_position &&
    savedTrack.trackPosition === tidalTrack.track_position
  );
  if (hasStrongAlbumMatch && hasExactTrackPosition) {
    score += 25;
    if (durationDiff <= 3) {
      score += 15;
    }
  }

  if (hasStrongAlbumMatch && savedTrack.diskNumber && tidalTrack.disk_number && savedTrack.diskNumber === tidalTrack.disk_number) {
    score += 5;
  }
  
  return Math.min(score, 100);
}

/**
 * Find the best matching TIDAL track for a saved music track
 */
async function findClosestTidalMatch(savedTrack: SavedMusic): Promise<{ track: MusicTrack; score: number } | null> {
  try {
    const queries = buildTidalSearchQueries(savedTrack);
    let bestMatch: MusicTrack | null = null;
    let bestScore = 0;

    for (const query of queries) {
      const results = await searchTidalTracks(query, 10, false);
      if (results.length === 0) continue;

      for (const track of results) {
        const score = calculateMatchConfidence(savedTrack, track);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = track;
        }
      }

      // If we already have a strong candidate from an earlier query, stop
      // expanding the search. This keeps the fallback path cheaper.
      if (bestScore >= 85) break;
    }

    if (bestScore < 85 && normalizeMatchValue(savedTrack.album)) {
      const albumQueries = [
        `${savedTrack.album} ${savedTrack.artist}`.trim(),
        `${normalizeMatchValue(savedTrack.album)} ${normalizeMatchValue(savedTrack.artist)}`.trim(),
        normalizeMatchValue(savedTrack.album),
        `${normalizeMatchValue(savedTrack.artist)} ${normalizeMatchValue(savedTrack.album)}`.trim(),
      ];

      for (const query of [...new Set(albumQueries.filter(Boolean))]) {
        const results = await searchTidalTracks(query, 10, true);
        if (results.length === 0) continue;

        for (const track of results) {
          const score = calculateMatchConfidence(savedTrack, track);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = track;
          }
        }

        if (bestScore >= 85) break;
      }
    }

    return bestMatch ? { track: bestMatch, score: bestScore } : null;
  } catch (error) {
    console.error('[tidalMigrationService] Search error for track:', savedTrack.title, error);
    return null;
  }
}

async function findBestTidalMatch(savedTrack: SavedMusic): Promise<MusicTrack | null> {
  const closest = await findClosestTidalMatch(savedTrack);
  return closest && closest.score >= 65 ? closest.track : null;
}

/**
 * Update a saved music document in Firestore with TIDAL metadata
 * Preserves all local MusicNexus metadata (rating, tags, savedAt, ratingHistory, firebaseId)
 */
async function updateTrackWithTidalMetadata(
  firebaseId: string,
  savedTrack: SavedMusic,
  tidalTrack: MusicTrack
): Promise<void> {
  const updateData = {
    // TIDAL-specific metadata to update
    id: tidalTrack.id,
    title: tidalTrack.title,
    artist: tidalTrack.artist.name,
    artistId: tidalTrack.artist.id,
    album: tidalTrack.album.title,
    albumId: tidalTrack.album.id,
    coverUrl: tidalTrack.album.cover_big || tidalTrack.album.cover,
    duration: tidalTrack.duration,
    trackPosition: tidalTrack.track_position || savedTrack.trackPosition,
    diskNumber: tidalTrack.disk_number || savedTrack.diskNumber,
    releaseDate: tidalTrack.album.release_date || savedTrack.releaseDate,
    
    // Preserve local MusicNexus metadata - DO NOT MODIFY
    // rating: savedTrack.rating,
    // savedAt: savedTrack.savedAt,
    // tags: savedTrack.tags,
    // firebaseId: savedTrack.firebaseId,
    // ratingHistory: savedTrack.ratingHistory,
  };
  
  const docRef = doc(db, 'savedMusic', firebaseId);
  await updateDoc(docRef, updateData);
}

/**
 * Retry one migration using the supplied search fields. The supplied track is
 * only used as search input; local metadata is never written to Firestore.
 */
export async function retrySavedMusicToTidal(track: SavedMusic): Promise<MusicTrack> {
  if (!track.firebaseId) {
    throw new Error('The saved song does not have a Firebase document ID');
  }

  const matchedTrack = await findBestTidalMatch(track);
  if (!matchedTrack) {
    throw new Error('No confident match found on TIDAL');
  }

  await updateTrackWithTidalMetadata(track.firebaseId, track, matchedTrack);
  await setSavedMusicMeta();
  return matchedTrack;
}

/** Approve a previously suggested candidate without applying the confidence threshold. */
export async function approveTidalMigration(track: SavedMusic, matchedTrack: MusicTrack): Promise<void> {
  if (!track.firebaseId) {
    throw new Error('The saved song does not have a Firebase document ID');
  }

  await updateTrackWithTidalMetadata(track.firebaseId, track, matchedTrack);
  await setSavedMusicMeta();
}

/**
 * Main migration function - migrates all saved music to TIDAL
 */
export async function migrateSavedMusicToTidal(
  savedMusic: SavedMusic[],
  onProgress: ProgressCallback,
  onComplete: SummaryCallback
): Promise<void> {
  const results: MigrationResult[] = [];
  const migrationLog: MigrationLogEntry[] = [];
  let successful = 0;
  let failed = 0;
  
  // Existing TIDAL artwork is the provider marker used by savedMusic. These
  // tracks are already migrated and must not trigger another API search.
  const tracksToMigrate = savedMusic.filter(track => !isAlreadyTidalTrack(track));
  const total = tracksToMigrate.length;
  
  for (let i = 0; i < total; i++) {
    const track = tracksToMigrate[i];
    
    // Update progress - searching
    onProgress({
      current: i + 1,
      total,
      currentTrack: `${track.title} - ${track.artist}`,
      status: 'searching',
    });
    
    // Find best TIDAL match
    const closestMatch = await findClosestTidalMatch(track);
    const matchedTrack = closestMatch && closestMatch.score >= 65
      ? closestMatch.track
      : null;
    
    if (!matchedTrack) {
      // No confident match found
      failed++;
      const logEntry: MigrationLogEntry = {
        originalTrack: track,
        reason: 'No confident match found on TIDAL',
        timestamp: new Date().toISOString(),
        closestMatch: closestMatch?.track,
        matchConfidence: closestMatch?.score,
      };
      migrationLog.push(logEntry);
      
      results.push({
        success: false,
        originalTrack: track,
        error: 'No confident match found on TIDAL',
      });
      
      onProgress({
        current: i + 1,
        total,
        currentTrack: `${track.title} - ${track.artist}`,
        status: 'failed',
      });
      continue;
    }
    
    // Update progress - updating
    onProgress({
      current: i + 1,
      total,
      currentTrack: `${track.title} - ${track.artist}`,
      status: 'updating',
    });
    
    try {
      // Update Firestore with TIDAL metadata
      if (track.firebaseId) {
        await updateTrackWithTidalMetadata(track.firebaseId, track, matchedTrack);
      }
      
      successful++;
      results.push({
        success: true,
        originalTrack: track,
        matchedTrack,
      });
      
      onProgress({
        current: i + 1,
        total,
        currentTrack: `${track.title} - ${track.artist}`,
        status: 'completed',
      });
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const logEntry: MigrationLogEntry = {
        originalTrack: track,
        reason: `Failed to update Firestore: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      migrationLog.push(logEntry);
      
      results.push({
        success: false,
        originalTrack: track,
        matchedTrack,
        error: errorMessage,
      });
      
      onProgress({
        current: i + 1,
        total,
        currentTrack: `${track.title} - ${track.artist}`,
        status: 'failed',
      });
    }
  }

  if (successful > 0) {
    await setSavedMusicMeta();
  }
  
  // Save migration log to AsyncStorage for user reference
  const logKey = `migrationLog_${Date.now()}`;
  await AsyncStorage.setItem(logKey, JSON.stringify(migrationLog));
  
  // Return summary
  const summary: MigrationSummary = {
    total,
    successful,
    failed,
    results,
    migrationLog,
  };
  
  onComplete(summary);
}

/**
 * Get saved migration logs from AsyncStorage
 */
export async function getMigrationLogs(): Promise<MigrationLogEntry[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const migrationKeys = keys.filter(key => key.startsWith('migrationLog_'));
    
    if (migrationKeys.length === 0) return [];
    
    // Get the most recent log
    const latestKey = migrationKeys.sort().pop()!;
    const logJson = await AsyncStorage.getItem(latestKey);
    return logJson ? JSON.parse(logJson) : [];
  } catch (error) {
    console.error('[tidalMigrationService] Error reading migration logs:', error);
    return [];
  }
}

/**
 * Clear all migration logs
 */
export async function clearMigrationLogs(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const migrationKeys = keys.filter(key => key.startsWith('migrationLog_'));
    await AsyncStorage.multiRemove(migrationKeys);
  } catch (error) {
    console.error('[tidalMigrationService] Error clearing migration logs:', error);
  }
}
