// src/hooks/useTrackSaver.ts
// Hook for saving tracks and managing their state
import { useCallback } from 'react';
import { DeezerTrack } from '../types/music';
import { TrackOperationsService } from '../services/trackOperationsService';
import { useMusicStore } from '../store/musicStore';

export function useTrackSaver() {
  const { getSavedMusicById, isTrackSaving } = useMusicStore();

  const saveTrack = useCallback(async (track: DeezerTrack, rating: number = 0) => {
    try {
      await TrackOperationsService.saveTrack(track, rating);
    } catch (error) {
      // Error handling is already done in TrackOperationsService
      console.error('Error in useTrackSaver:', error);
    }
  }, []);

  const handleTrackPress = useCallback((track: DeezerTrack) => {
    const savedMusicData = getSavedMusicById(track.id);
    
    const onSaveWithoutRating = () => saveTrack(track, 0);
    const onSaveWithRating = () => {
      TrackOperationsService.showRatingDialog(track, (rating) => {
        saveTrack(track, rating);
      });
    };

    TrackOperationsService.showTrackDialog(
      track,
      savedMusicData,
      onSaveWithoutRating,
      onSaveWithRating
    );
  }, [getSavedMusicById, saveTrack]);

  return {
    isSaving: isTrackSaving,
    handleTrackPress,
  };
}