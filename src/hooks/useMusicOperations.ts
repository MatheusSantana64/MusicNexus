// src/hooks/useMusicOperations.ts
// Custom hook for music operations like saving tracks and albums
import { useCallback, useState } from 'react';
import { DeezerTrack } from '../types';
import { MusicOperationsService, AlbumGroup } from '../services/musicOperationsService';
import { useMusicStore } from '../store/musicStore';
import { useModal } from './useModal';

export function useMusicOperations() {
  const { getSavedMusicById, isTrackSaving, isAlbumSaving, isMusicSaved } = useMusicStore();
  
  // MODAL STATE FOR SEARCH SCREEN
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<DeezerTrack | null>(null);
  const [ratingType, setRatingType] = useState<'track' | 'album'>('track');
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumGroup | null>(null);

  // Modal hook for dialogs
  const { showModal } = useModal();

  // Track operations
  const saveTrack = useCallback(async (track: DeezerTrack, rating: number = 0, tags: string[] = []) => {
    try {
      console.log('🎵 Starting track save:', track.title);
      await MusicOperationsService.saveTrack(track, rating, tags);
      console.log('✅ Track save completed:', track.title);
    } catch (error) {
      console.error('❌ Error saving track:', error);
    }
  }, []);

  const handleTrackPress = useCallback((track: DeezerTrack) => {
    const savedMusicData = getSavedMusicById(track.id);
    
    const onSaveWithoutRating = () => saveTrack(track, 0);
    const onSaveWithRating = () => {
      setSelectedTrack(track);
      setRatingType('track');
      setRatingModalVisible(true);
    };

    MusicOperationsService.showTrackDialog(
      track,
      savedMusicData,
      onSaveWithoutRating,
      onSaveWithRating,
      showModal
    );
  }, [getSavedMusicById, saveTrack, showModal]);

  // Album operations
  const saveAlbum = useCallback(async (albumGroup: AlbumGroup, rating: number = 0, tags: string[] = []) => {
    try {
      const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
      await MusicOperationsService.saveAlbumTracks(albumGroup, rating, unsavedTracks, undefined, tags);
    } catch (error) {
      console.error('Error saving album:', error);
    }
  }, [isMusicSaved]);

  const handleAlbumSave = useCallback((albumGroup: AlbumGroup) => {
    const savedTracks = albumGroup.tracks.filter((track: DeezerTrack) => isMusicSaved(track.id));
    const unsavedTracks = albumGroup.tracks.filter((track: DeezerTrack) => !isMusicSaved(track.id));
    
    const onSaveWithoutRating = () => saveAlbum(albumGroup, 0);
    const onSaveWithRating = () => {
      setSelectedAlbum(albumGroup);
      setRatingType('album');
      setRatingModalVisible(true);
    };

    MusicOperationsService.showAlbumDialog(
      albumGroup,
      savedTracks.length,
      unsavedTracks.length,
      onSaveWithoutRating,
      onSaveWithRating,
      showModal
    );
  }, [isMusicSaved, saveAlbum, showModal]);

  // HANDLE RATING SAVE FOR SEARCH SCREEN
  const handleRatingSave = useCallback(async (rating: number, tags: string[]) => {
    if (ratingType === 'track' && selectedTrack) {
      await saveTrack(selectedTrack, rating, tags);
    } else if (ratingType === 'album' && selectedAlbum) {
      await saveAlbum(selectedAlbum, rating, tags);
    }

    setRatingModalVisible(false);
    setSelectedTrack(null);
    setSelectedAlbum(null);
  }, [ratingType, selectedTrack, selectedAlbum, saveTrack, saveAlbum]);

  // HANDLE RATING CANCEL FOR SEARCH SCREEN
  const handleRatingCancel = useCallback(() => {
    setRatingModalVisible(false);
    setSelectedTrack(null);
    setSelectedAlbum(null);
  }, []);

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
    
    // MODAL STATE FOR SEARCH SCREEN
    ratingModalVisible,
    selectedTrack,
    selectedAlbum,
    ratingType,
    handleRatingSave,
    handleRatingCancel,
  };
}