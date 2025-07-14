import { DeezerTrack, SavedMusic } from '../types/music';
import { saveMusic, saveMusicBatch } from './musicService';
import { useMusicStore } from '../store/musicStore';
import { DeezerService } from './deezerService';

/**
 * Smart service that handles music operations with automatic store updates
 */
export class MusicStoreService {
  
  /**
   * Saves a track and automatically updates the store
   */
  static async saveTrack(track: DeezerTrack, rating: number = 0): Promise<string> {
    try {
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
    }
  }

  /**
   * Saves multiple tracks and automatically updates the store
   */
  static async saveTracksBatch(tracks: DeezerTrack[], rating: number = 0): Promise<string[]> {
    try {
      // 1. Save to database first
      const firebaseIds = await saveMusicBatch(tracks, rating);
      
      // 2. Create SavedMusic objects
      const savedMusics: SavedMusic[] = tracks.map((track, index) => ({
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
    }
  }
}