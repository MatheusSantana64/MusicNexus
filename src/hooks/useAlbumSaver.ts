// src/hooks/useAlbumSaver.ts
// Hook for saving albums and managing their state
import { useCallback } from 'react';
import { DeezerTrack } from '../types/music';
import { AlbumOperationsService, AlbumGroup } from '../services/albumOperationsService';
import { useMusicStore } from '../store/musicStore';

export function useAlbumSaver() {
  const { isMusicSaved, isAlbumSaving } = useMusicStore();

  const saveAlbum = useCallback(async (albumGroup: AlbumGroup, rating: number = 0) => {
    try {
      const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
      await AlbumOperationsService.saveAlbumTracks(albumGroup, rating, unsavedTracks);
    } catch (error) {
      // Error handling is already done in AlbumOperationsService
      console.error('Error in useAlbumSaver:', error);
    }
  }, [isMusicSaved]);

  const handleSaveAlbum = useCallback((albumGroup: AlbumGroup) => {
    const savedTracks = albumGroup.tracks.filter((track: DeezerTrack) => isMusicSaved(track.id));
    const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
    
    const onSaveWithoutRating = () => saveAlbum(albumGroup, 0);
    const onSaveWithRating = () => {
      AlbumOperationsService.showRatingDialog(albumGroup, (rating) => {
        saveAlbum(albumGroup, rating);
      });
    };

    AlbumOperationsService.showSaveAlbumDialog(
      albumGroup,
      savedTracks.length,
      unsavedTracks.length,
      onSaveWithoutRating,
      onSaveWithRating
    );
  }, [isMusicSaved, saveAlbum]);

  return {
    isSaving: isAlbumSaving, // ✨ Direct reference to store method
    handleSaveAlbum,
  };
}