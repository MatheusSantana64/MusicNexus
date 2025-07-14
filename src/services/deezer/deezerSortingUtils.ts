// src/services/deezer/deezerSortingUtils.ts
import { DeezerTrack, DeezerAlbum } from '../../types/music';
import { compareDates } from '../../utils/dateUtils';

export class DeezerSortingUtils {
  static sortAlbumsByReleaseDate(albums: DeezerAlbum[]): DeezerAlbum[] {
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

  static sortTracksByAlbumOrder(tracks: DeezerTrack[]): DeezerTrack[] {
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