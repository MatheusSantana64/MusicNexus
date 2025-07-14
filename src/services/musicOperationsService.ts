// src/services/musicOperationsService.ts
// Handles music operations like saving tracks and albums, showing dialogs, etc.
import { Alert } from 'react-native';
import { DeezerTrack, SavedMusic } from '../types/music';
import { saveMusic, saveMusicBatch } from './musicService';
import { useMusicStore } from '../store/musicStore';
import { DeezerService } from './deezer/deezerService';

export interface AlbumGroup {
  albumId: string;
  album: any;
  artist: any;
  tracks: DeezerTrack[];
  releaseDate: string;
}

export class MusicOperationsService {
  // === TRACK OPERATIONS ===
  static async saveTrack(track: DeezerTrack, rating: number): Promise<void> {
    const store = useMusicStore.getState();
    
    try {
      store.startTrackSave(track.id);
      
      console.log('💾 Saving track to Firebase:', track.title);
      const firebaseId = await saveMusic(track, { rating });
      
      // Create SavedMusic object for optimistic update
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
        releaseDate: track.album.release_date,
        trackPosition: track.track_position || 1,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId,
      };

      // OPTIMISTIC UPDATE TO STORE
      store.addMusic(savedMusic);
      
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
    unsavedTracks: DeezerTrack[]
  ): Promise<string[]> {
    if (unsavedTracks.length === 0) {
      Alert.alert('Warning', 'All tracks are already saved in the library.');
      return [];
    }

    const store = useMusicStore.getState();
    store.startAlbumSave(albumGroup.albumId);
    unsavedTracks.forEach(track => store.startTrackSave(track.id));

    try {
      const firebaseIds = await saveMusicBatch(unsavedTracks, rating);
      
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
        releaseDate: DeezerService.getTrackReleaseDate(track) || '1900-01-01',
        trackPosition: track.track_position || 0,
        diskNumber: track.disk_number || 1,
        savedAt: new Date(),
        firebaseId: firebaseIds[index],
      })).filter((_, index) => firebaseIds[index]);

      store.addMusicBatch(savedMusics);
      console.log(`✅ Album saved: ${firebaseIds.length} tracks`);
      return firebaseIds;
    } catch (error) {
      Alert.alert('Error', 'Could not save all tracks. Please try again.');
      console.error('Error saving album tracks:', error);
      throw error;
    } finally {
      store.finishAlbumSave(albumGroup.albumId);
      unsavedTracks.forEach(track => store.finishTrackSave(track.id));
    }
  }

  // === DIALOG HELPERS ===
  static showTrackDialog(
    track: DeezerTrack,
    savedMusicData: SavedMusic | null,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void
  ): void {
    const releaseYear = track.album?.release_date ? 
      new Date(track.album.release_date).getFullYear() : 'Unknown year';

    if (savedMusicData) {
      Alert.alert(
        '⚠️ Song already saved',
        `"${track.title}" is already in your library with rating ${savedMusicData.rating === 0 ? 'no rating' : savedMusicData.rating}.\n\nDo you want to save it again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save again', style: 'default', onPress: onSaveWithoutRating },
        ]
      );
    } else {
      Alert.alert(
        track.title,
        `Artist: ${track.artist.name}\nAlbum: ${track.album.title}\nYear: ${releaseYear}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save without rating', onPress: onSaveWithoutRating },
          { text: 'Rate and save', onPress: onSaveWithRating },
        ]
      );
    }
  }

  static showAlbumDialog(
    albumGroup: AlbumGroup,
    savedCount: number,
    unsavedCount: number,
    onSaveWithoutRating: () => void,
    onSaveWithRating: () => void
  ): void {
    if (unsavedCount === 0) {
      Alert.alert(
        'Album already saved',
        `All tracks from "${albumGroup.album.title}" are already in your library.`,
        [{ text: 'OK' }]
      );
      return;
    }

    let message = `Save ${albumGroup.tracks.length} tracks from album "${albumGroup.album.title}" by ${albumGroup.artist.name}?`;
    
    if (savedCount > 0) {
      message += `\n\n⚠️ ${savedCount} track(s) are already saved and will be ignored.`;
    }

    Alert.alert(
      'Save Complete Album',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save without rating', onPress: onSaveWithoutRating },
        { text: 'Rate and save', onPress: onSaveWithRating },
      ]
    );
  }
}