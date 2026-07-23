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
}

export interface MigrationProgress {
  current: number;
  total: number;
  currentTrack: string;
  status: 'searching' | 'matching' | 'updating' | 'completed' | 'failed';
}

type ProgressCallback = (progress: MigrationProgress) => void;
type SummaryCallback = (summary: MigrationSummary) => void;

/**
 * Build a search query for TIDAL from a SavedMusic track
 */
function buildTidalSearchQuery(track: SavedMusic): string {
  // Use track title and artist for best matching
  return `${track.title} ${track.artist}`;
}

/**
 * Calculate match confidence between a saved track and a TIDAL track
 * Returns a score from 0-100
 */
function calculateMatchConfidence(savedTrack: SavedMusic, tidalTrack: MusicTrack): number {
  let score = 0;
  
  // Title match (exact = 40, partial = 20)
  const savedTitle = savedTrack.title.toLowerCase().trim();
  const tidalTitle = tidalTrack.title.toLowerCase().trim();
  if (savedTitle === tidalTitle) {
    score += 40;
  } else if (savedTitle.includes(tidalTitle) || tidalTitle.includes(savedTitle)) {
    score += 20;
  }
  
  // Artist match (exact = 30, partial = 15)
  const savedArtist = savedTrack.artist.toLowerCase().trim();
  const tidalArtist = tidalTrack.artist.name.toLowerCase().trim();
  if (savedArtist === tidalArtist) {
    score += 30;
  } else if (savedArtist.includes(tidalArtist) || tidalArtist.includes(savedArtist)) {
    score += 15;
  }
  
  // Album match (exact = 15, partial = 8)
  const savedAlbum = savedTrack.album.toLowerCase().trim();
  const tidalAlbum = tidalTrack.album.title.toLowerCase().trim();
  if (savedAlbum === tidalAlbum) {
    score += 15;
  } else if (savedAlbum.includes(tidalAlbum) || tidalAlbum.includes(savedAlbum)) {
    score += 8;
  }
  
  // Duration match (within 5 seconds = 10, within 10 seconds = 5)
  const durationDiff = Math.abs(savedTrack.duration - tidalTrack.duration);
  if (durationDiff <= 5) {
    score += 10;
  } else if (durationDiff <= 10) {
    score += 5;
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
  
  return Math.min(score, 100);
}

/**
 * Find the best matching TIDAL track for a saved music track
 */
async function findBestTidalMatch(savedTrack: SavedMusic): Promise<MusicTrack | null> {
  const query = buildTidalSearchQuery(savedTrack);
  
  try {
    const results = await searchTidalTracks(query, 10, false);
    
    if (results.length === 0) {
      return null;
    }
    
    // Score all results and find the best match
    let bestMatch: MusicTrack | null = null;
    let bestScore = 0;
    
    for (const track of results) {
      const score = calculateMatchConfidence(savedTrack, track);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = track;
      }
    }
    
    // Only return match if confidence is high enough (threshold: 70)
    if (bestScore >= 70 && bestMatch) {
      return bestMatch;
    }
    
    return null;
  } catch (error) {
    console.error('[tidalMigrationService] Search error for track:', savedTrack.title, error);
    return null;
  }
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
  
  const total = savedMusic.length;
  
  for (let i = 0; i < total; i++) {
    const track = savedMusic[i];
    
    // Update progress - searching
    onProgress({
      current: i + 1,
      total,
      currentTrack: `${track.title} - ${track.artist}`,
      status: 'searching',
    });
    
    // Find best TIDAL match
    const matchedTrack = await findBestTidalMatch(track);
    
    if (!matchedTrack) {
      // No confident match found
      failed++;
      const logEntry: MigrationLogEntry = {
        originalTrack: track,
        reason: 'No confident match found on TIDAL',
        timestamp: new Date().toISOString(),
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