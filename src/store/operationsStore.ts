import { create } from 'zustand';

interface OperationState {
  // Track operations
  savingTracks: Set<string>;
  savingAlbums: Set<string>;
  updatingRatings: Set<string>;
  deletingMusic: Set<string>;
  
  // Actions
  startTrackSave: (trackId: string) => void;
  finishTrackSave: (trackId: string) => void;
  startAlbumSave: (albumId: string) => void;
  finishAlbumSave: (albumId: string) => void;
  startRatingUpdate: (firebaseId: string) => void;
  finishRatingUpdate: (firebaseId: string) => void;
  startMusicDelete: (firebaseId: string) => void;
  finishMusicDelete: (firebaseId: string) => void;
  
  // Queries
  isTrackSaving: (trackId: string) => boolean;
  isAlbumSaving: (albumId: string) => boolean;
  isRatingUpdating: (firebaseId: string) => boolean;
  isMusicDeleting: (firebaseId: string) => boolean;
  isAnyOperationInProgress: () => boolean;
  getActiveOperationsCount: () => number;
}

export const useOperationsStore = create<OperationState>((set, get) => ({
  // Initial state
  savingTracks: new Set(),
  savingAlbums: new Set(),
  updatingRatings: new Set(),
  deletingMusic: new Set(),

  // Track operations
  startTrackSave: (trackId: string) => {
    const { savingTracks } = get();
    if (!savingTracks.has(trackId)) {
      set({ savingTracks: new Set(savingTracks).add(trackId) });
      console.log('🎵 Started saving track:', trackId);
    }
  },

  finishTrackSave: (trackId: string) => {
    const { savingTracks } = get();
    if (savingTracks.has(trackId)) {
      const newSet = new Set(savingTracks);
      newSet.delete(trackId);
      set({ savingTracks: newSet });
      console.log('✅ Finished saving track:', trackId);
    }
  },

  // Album operations
  startAlbumSave: (albumId: string) => {
    const { savingAlbums } = get();
    if (!savingAlbums.has(albumId)) {
      set({ savingAlbums: new Set(savingAlbums).add(albumId) });
      console.log('💿 Started saving album:', albumId);
    }
  },

  finishAlbumSave: (albumId: string) => {
    const { savingAlbums } = get();
    if (savingAlbums.has(albumId)) {
      const newSet = new Set(savingAlbums);
      newSet.delete(albumId);
      set({ savingAlbums: newSet });
      console.log('✅ Finished saving album:', albumId);
    }
  },

  // Rating operations
  startRatingUpdate: (firebaseId: string) => {
    const { updatingRatings } = get();
    if (!updatingRatings.has(firebaseId)) {
      set({ updatingRatings: new Set(updatingRatings).add(firebaseId) });
      console.log('⭐ Started updating rating:', firebaseId);
    }
  },

  finishRatingUpdate: (firebaseId: string) => {
    const { updatingRatings } = get();
    if (updatingRatings.has(firebaseId)) {
      const newSet = new Set(updatingRatings);
      newSet.delete(firebaseId);
      set({ updatingRatings: newSet });
      console.log('✅ Finished updating rating:', firebaseId);
    }
  },

  // Delete operations
  startMusicDelete: (firebaseId: string) => {
    const { deletingMusic } = get();
    if (!deletingMusic.has(firebaseId)) {
      set({ deletingMusic: new Set(deletingMusic).add(firebaseId) });
      console.log('🗑️ Started deleting music:', firebaseId);
    }
  },

  finishMusicDelete: (firebaseId: string) => {
    const { deletingMusic } = get();
    if (deletingMusic.has(firebaseId)) {
      const newSet = new Set(deletingMusic);
      newSet.delete(firebaseId);
      set({ deletingMusic: newSet });
      console.log('✅ Finished deleting music:', firebaseId);
    }
  },

  // Query methods
  isTrackSaving: (trackId: string): boolean => {
    const { savingTracks } = get();
    return savingTracks.has(trackId);
  },

  isAlbumSaving: (albumId: string): boolean => {
    const { savingAlbums } = get();
    return savingAlbums.has(albumId);
  },

  isRatingUpdating: (firebaseId: string): boolean => {
    const { updatingRatings } = get();
    return updatingRatings.has(firebaseId);
  },

  isMusicDeleting: (firebaseId: string): boolean => {
    const { deletingMusic } = get();
    return deletingMusic.has(firebaseId);
  },

  isAnyOperationInProgress: (): boolean => {
    const { savingTracks, savingAlbums, updatingRatings, deletingMusic } = get();
    return savingTracks.size > 0 || 
           savingAlbums.size > 0 || 
           updatingRatings.size > 0 || 
           deletingMusic.size > 0;
  },

  getActiveOperationsCount: (): number => {
    const { savingTracks, savingAlbums, updatingRatings, deletingMusic } = get();
    return savingTracks.size + savingAlbums.size + updatingRatings.size + deletingMusic.size;
  },
}));