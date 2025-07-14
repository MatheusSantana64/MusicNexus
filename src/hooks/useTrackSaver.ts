import { useState, useCallback } from 'react';
import { DeezerTrack } from '../types/music';
import { TrackOperationsService } from '../services/trackOperationsService';
import { useMusicStore } from '../store/musicStore';

export function useTrackSaver() {
  const [savingTrackIds, setSavingTrackIds] = useState<Set<string>>(new Set());
  
  // Use store instead of context
  const { getSavedMusicById, loadMusic } = useMusicStore();

  const isSaving = useCallback((trackId: string): boolean => {
    return savingTrackIds.has(trackId);
  }, [savingTrackIds]);

  const saveTrack = useCallback(async (track: DeezerTrack, rating: number = 0) => {
    const trackId = track.id;
    
    // Set loading state
    setSavingTrackIds(prev => new Set(prev).add(trackId));
    
    try {
      await TrackOperationsService.saveTrack(track, rating);
      await loadMusic(); // Refresh store
    } finally {
      // Clear loading state
      setSavingTrackIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
    }
  }, [loadMusic]);

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
    isSaving,
    handleTrackPress,
  };
}