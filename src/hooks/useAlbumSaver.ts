import { useState, useCallback } from 'react';
import { DeezerTrack } from '../types/music';
import { AlbumOperationsService, AlbumGroup } from '../services/albumOperationsService';
import { useMusicStore } from '../store/musicStore';

export function useAlbumSaver() {
  const [savingAlbumIds, setSavingAlbumIds] = useState<Set<string>>(new Set());
  
  // Use store instead of context
  const { isMusicSaved } = useMusicStore();

  const isSaving = useCallback((albumId: string): boolean => {
    return savingAlbumIds.has(albumId);
  }, [savingAlbumIds]);

  const saveAlbum = useCallback(async (albumGroup: AlbumGroup, rating: number = 0) => {
    const albumId = albumGroup.albumId;
    
    // Set loading state
    setSavingAlbumIds(prev => new Set(prev).add(albumId));
    
    try {
      const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
      await AlbumOperationsService.saveAlbumTracks(albumGroup, rating, unsavedTracks);
      // ✨ No need to call loadMusic() - store auto-updates!
    } finally {
      // Clear loading state
      setSavingAlbumIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(albumId);
        return newSet;
      });
    }
  }, [isMusicSaved]); // ✨ Removed loadMusic dependency

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
    isSaving,
    handleSaveAlbum,
  };
}