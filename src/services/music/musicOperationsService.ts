// src/services/music/musicOperationsService.ts
// Handles music operations like saving tracks and albums, showing dialogs, etc.
import { MusicTrack, SavedMusic } from '../../types';
import { saveMusic, saveMusicBatch } from './musicService';
import { useMusicStore } from '../../store/musicStore';
import { MusicSearchService } from './musicSearchService';
import { setSavedMusicMeta } from '../firestoreMetaHelper';

export interface AlbumGroup {
  albumId: string;
  album: any;
  artist: any;
  tracks: MusicTrack[];
  releaseDate: string;
}

// Modal action interface for consistency
interface ShowModalFunction {
  (options: {
    title: string;
    message: string;
    actions: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress: () => void;
    }>;
  }): void;
}

export class MusicOperationsService {
  // === TRACK OPERATIONS ===
  static async saveTrack(track: MusicTrack, rating: number, tags: string[] = []): Promise<void> {
    const store = useMusicStore.getState();

    try {
      store.startTrackSave(track.id);

      console.log('💾 Saving track to Firebase:', track.title);
      const firebaseId = await saveMusic(track, { rating, tags });

      // Create SavedMusic object for optimistic update
      const now = new Date().toISOString();
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
        releaseDate: MusicSearchService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 1,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId,
        tags,
        ratingHistory: rating > 0 ? [{ rating, timestamp: now }] : [],
      };

      // OPTIMISTIC UPDATE TO STORE
      store.addMusic(savedMusic);
      await setSavedMusicMeta();

      console.log('✅ Track saved successfully:', track.title);
    } catch (error) {
      console.error('❌ Error saving track:', error);
      throw error;
    } finally {
      store.finishTrackSave(track.id);
    }
  }

  // === ALBUM OPERATIONS ===
  static async saveAlbumTracks(
    albumGroup: AlbumGroup, 
    rating: number, 
    unsavedTracks: MusicTrack[],
    showModal?: ShowModalFunction,
    tags: string[] = []
  ): Promise<string[]> {
    if (unsavedTracks.length === 0) {
      if (showModal) {
        showModal({
          title: 'Warning',
          message: 'All tracks are already saved in the library.',
          actions: [
            { text: 'OK', style: 'default', onPress: () => {} }
          ]
        });
      }
      return [];
    }

    const store = useMusicStore.getState();
    store.startAlbumSave(albumGroup.albumId);
    unsavedTracks.forEach(track => store.startTrackSave(track.id));

    try {
      const firebaseIds = await saveMusicBatch(unsavedTracks, rating, tags);
      
      const savedMusics: SavedMusic[] = unsavedTracks.map((track, index) => ({
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
        releaseDate: MusicSearchService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 0,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId: firebaseIds[index],
        tags,
      })).filter((_, index) => firebaseIds[index]);

      store.addMusicBatch(savedMusics);
      await setSavedMusicMeta();
      console.log(`✅ Album saved: ${firebaseIds.length} tracks`);
      return firebaseIds;
    } catch (error) {
      if (showModal) {
        showModal({
          title: 'Error',
          message: 'Could not save all tracks. Please try again.',
          actions: [
            { text: 'OK', style: 'default', onPress: () => {} }
          ]
        });
      }
      console.error('Error saving album tracks:', error);
      throw error;
    } finally {
      store.finishAlbumSave(albumGroup.albumId);
      unsavedTracks.forEach(track => store.finishTrackSave(track.id));
    }
  }

  // === DIALOG HELPERS ===
  static showTrackDialog(
    track: MusicTrack,
    savedMusicData: SavedMusic | null,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void,
    showModal: ShowModalFunction
  ): void {
    if (savedMusicData) {
      showModal({
        title: '⚠️ Song already saved',
        message: `"${track.title}" is already in your library with rating ${savedMusicData.rating === 0 ? 'no rating' : savedMusicData.rating}.\n\nDo you want to save it again?`,
        actions: [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { text: 'Save again', style: 'default', onPress: onSaveWithoutRating },
        ]
      });
    } else {
      onSaveWithRating();
    }
  }

  static showAlbumDialog(
    albumGroup: AlbumGroup,
    savedCount: number,
    unsavedCount: number,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void,
    showModal: ShowModalFunction
  ): void {
    if (unsavedCount === 0) {
      showModal({
        title: 'Album already saved',
        message: `All tracks from "${albumGroup.album.title}" are already in your library.`,
        actions: [
          { text: 'OK', style: 'default', onPress: () => {} }
        ]
      });
      return;
    }

    onSaveWithoutRating();
  }
}