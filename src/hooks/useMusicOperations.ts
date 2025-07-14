// src/hooks/useMusicOperations.ts
// Custom hook for music operations like saving tracks and albums
import { useCallback } from 'react';
import { DeezerTrack } from '../types/music';
import { MusicOperationsService, AlbumGroup } from '../services/musicOperationsService';
import { useMusicStore } from '../store/musicStore';

export function useMusicOperations() {
  const { getSavedMusicById, isTrackSaving, isAlbumSaving, isMusicSaved } = useMusicStore();

  // Track operations
  const saveTrack = useCallback(async (track: DeezerTrack, rating: number = 0) => {
    try {
      await MusicOperationsService.saveTrack(track, rating);
    } catch (error) {
      console.error('Error saving track:', error);
    }
  }, []);

  const handleTrackPress = useCallback((track: DeezerTrack) => {
    const savedMusicData = getSavedMusicById(track.id);
    
    const onSaveWithoutRating = () => saveTrack(track, 0);
    const onSaveWithRating = () => {
      MusicOperationsService.showRatingDialog(
        'Rate Song',
        track.title,
        (rating) => saveTrack(track, rating)
      );
    };

    MusicOperationsService.showTrackDialog(
      track,
      savedMusicData,
      onSaveWithoutRating,
      onSaveWithRating
    );
  }, [getSavedMusicById, saveTrack]);

  // Album operations
  const saveAlbum = useCallback(async (albumGroup: AlbumGroup, rating: number = 0) => {
    try {
      const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
      await MusicOperationsService.saveAlbumTracks(albumGroup, rating, unsavedTracks);
    } catch (error) {
      console.error('Error saving album:', error);
    }
  }, [isMusicSaved]);

  const handleAlbumSave = useCallback((albumGroup: AlbumGroup) => {
    const savedTracks = albumGroup.tracks.filter((track: DeezerTrack) => isMusicSaved(track.id));
    const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
    
    const onSaveWithoutRating = () => saveAlbum(albumGroup, 0);
    const onSaveWithRating = () => {
      MusicOperationsService.showRatingDialog(
        'Rate Album',
        albumGroup.album.title,
        (rating) => saveAlbum(albumGroup, rating)
      );
    };

    MusicOperationsService.showAlbumDialog(
      albumGroup,
      savedTracks.length,
      unsavedTracks.length,
      onSaveWithoutRating,
      onSaveWithRating
    );
  }, [isMusicSaved, saveAlbum]);

  return {
    // Track operations
    saveTrack,
    handleTrackPress,
    isTrackSaving,
    
    // Album operations
    saveAlbum,
    handleAlbumSave,
    isAlbumSaving,
    
    // Shared utilities
    isMusicSaved,
    getSavedMusicById,
  };
}