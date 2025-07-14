// src/services/musicService.ts
// Music service for saving, updating, and deleting music
import { DeezerTrack, SavedMusic } from '../types/music';
import { saveMusic, saveMusicBatch } from './musicService';
import { useMusicStore } from '../store/musicStore';
import { useOperationsStore } from '../store/operationsStore';
import { DeezerService } from './deezerService';

// Smart service that handles music operations with automatic store updates
export class MusicStoreService {
  
  // Saves a track and automatically updates the store
  static async saveTrack(track: DeezerTrack, rating: number = 0): Promise<string> {
    const operations = useOperationsStore.getState();
    
    // ✨ Check if already saving
    if (operations.isTrackSaving(track.id)) {
      console.warn('⚠️ Track save already in progress for:', track.id);
      throw new Error('Esta música já está sendo salva. Aguarde...');
    }

    try {
      // ✨ Start operation tracking
      operations.startTrackSave(track.id);

      // 1. Save to database first
      const firebaseId = await saveMusic(track, { rating });
      
      // 2. Create SavedMusic object
      const savedMusic: SavedMusic = {
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        artistId: track.artist.id,
        album: track.album.title,
        albumId: track.album.id,
        coverUrl: track.album.cover_medium,
        preview: track.preview,
        duration: track.duration,
        rating,
        releaseDate: DeezerService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 0,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId,
      };
      
      // 3. Automatically update store
      useMusicStore.getState().addMusic(savedMusic);
      
      return firebaseId;
    } catch (error) {
      console.error('Error in saveTrack:', error);
      throw error;
    } finally {
      // ✨ Always finish operation tracking
      operations.finishTrackSave(track.id);
    }
  }

  // Saves multiple tracks and automatically updates the store
  static async saveTracksBatch(tracks: DeezerTrack[], rating: number = 0): Promise<string[]> {
    const operations = useOperationsStore.getState();
    
    // ✨ Filter out tracks already being saved
    const tracksToSave = tracks.filter(track => {
      if (operations.isTrackSaving(track.id)) {
        console.warn('⚠️ Skipping track already being saved:', track.id);
        return false;
      }
      return true;
    });

    if (tracksToSave.length === 0) {
      console.warn('⚠️ All tracks in batch are already being saved');
      return [];
    }

    // ✨ Start operation tracking for all tracks
    tracksToSave.forEach(track => operations.startTrackSave(track.id));

    try {
      // 1. Save to database first
      const firebaseIds = await saveMusicBatch(tracksToSave, rating);
      
      // 2. Create SavedMusic objects
      const savedMusics: SavedMusic[] = tracksToSave.map((track, index) => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        artistId: track.artist.id,
        album: track.album.title,
        albumId: track.album.id,
        coverUrl: track.album.cover_medium,
        preview: track.preview,
        duration: track.duration,
        rating,
        releaseDate: DeezerService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 0,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId: firebaseIds[index],
      })).filter((_, index) => firebaseIds[index]); // Only include successfully saved tracks
      
      // 3. Automatically update store
      useMusicStore.getState().addMusicBatch(savedMusics);
      
      return firebaseIds;
    } catch (error) {
      console.error('Error in saveTracksBatch:', error);
      throw error;
    } finally {
      // ✨ Always finish operation tracking for all tracks
      tracksToSave.forEach(track => operations.finishTrackSave(track.id));
    }
  }
}