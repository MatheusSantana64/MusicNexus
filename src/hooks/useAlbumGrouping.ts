// src/hooks/useAlbumGrouping.ts
// Groups tracks by album and sorts them by release date and title.
import { useMemo } from 'react';
import { DeezerTrack, SearchMode } from '../types';

export function useAlbumGrouping(tracks: DeezerTrack[], searchMode: SearchMode) {
  return useMemo(() => {
    // Only group for album search modes
    if (
      (searchMode !== 'spotify_album' && searchMode !== 'deezer_album') ||
      tracks.length === 0
    ) return [];

    const groups = tracks.reduce((acc, track) => {
      const albumId = track.album.id;
      if (!acc[albumId]) {
        acc[albumId] = {
          album: track.album,
          artist: track.artist,
          tracks: [],
          releaseDate: track.album.release_date,
        };
      }
      acc[albumId].tracks.push(track);
      return acc;
    }, {} as Record<string, { album: any; artist: any; tracks: DeezerTrack[]; releaseDate: string }>);

    return Object.entries(groups)
      .map(([albumId, group]) => ({
        albumId,
        ...group,
      }))
      .sort((a, b) => {
        if (a.releaseDate && b.releaseDate) {
          const dateA = new Date(a.releaseDate).getTime();
          const dateB = new Date(b.releaseDate).getTime();
          if (dateB !== dateA) return dateB - dateA;
        }
        return a.album.title.localeCompare(b.album.title);
      })
      .map(group => ({
        ...group,
        tracks: group.tracks.sort((a, b) => {
          const diskA = a.disk_number || 1;
          const diskB = b.disk_number || 1;
          if (diskA !== diskB) return diskA - diskB;
          
          const trackA = a.track_position || 999;
          const trackB = b.track_position || 999;
          return trackA - trackB;
        }),
      }));
  }, [tracks, searchMode]);
}