// src/utils/musicSortingUtils.ts
// MusicSortingUtils for sorting music tracks and albums
// This utility provides methods to sort albums by release date and tracks by album order
import { MusicTrack, MusicAlbum } from '../types';
import { compareDates } from './dateUtils';

export class MusicSortingUtils {
  static sortAlbumsByReleaseDate(albums: MusicAlbum[]): MusicAlbum[] {
    return albums.sort((a, b) => {
      if (a.release_date && b.release_date) {
        const dateComparison = compareDates(b.release_date, a.release_date);
        if (dateComparison !== 0) return dateComparison;
      }
      
      if (a.release_date && !b.release_date) return -1;
      if (!a.release_date && b.release_date) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  static sortTracksByAlbumOrder(tracks: MusicTrack[]): MusicTrack[] {
    return tracks.sort((a, b) => {
      if (a.album.release_date && b.album.release_date) {
        const dateComparison = compareDates(b.album.release_date, a.album.release_date);
        if (dateComparison !== 0) return dateComparison;
      }
      
      if (a.album.release_date && !b.album.release_date) return -1;
      if (!a.album.release_date && b.album.release_date) return 1;
      
      const albumComparison = a.album.title.localeCompare(b.album.title);
      if (albumComparison !== 0) return albumComparison;
      
      const diskA = a.disk_number || 1;
      const diskB = b.disk_number || 1;
      if (diskA !== diskB) return diskA - diskB;
      
      const trackPosA = a.track_position || 999;
      const trackPosB = b.track_position || 999;
      return trackPosA - trackPosB;
    });
  }
}