// src/utils/librarySortingUtils.ts
// Utility functions for sorting library music with hierarchical fallbacks
import { SavedMusic } from '../types';

export class LibrarySortingUtils {
  // Multi-field sorting for library music with hierarchical fallbacks
  // Primary sort respects isReversed flag, secondary sorts are always consistent
  static createSortFunction(primarySort: 'added' | 'rating' | 'release' | 'alphabetical' | 'album' | 'artist', isReversed: boolean = false) {
    return (a: SavedMusic, b: SavedMusic): number => {
      // 1. PRIMARY SORT (with isReversed)
      const primaryResult = this.getPrimarySortResult(a, b, primarySort, isReversed);
      if (primaryResult !== 0) return primaryResult;

      // 2-5. SECONDARY SORTS (always consistent, ignoring isReversed)
      if (primarySort !== 'release') {
        // For non-release modes: Release Date (newest first) → Album → Disk → Track
        const releaseResult = this.sortByReleaseDate(a, b, false);
        if (releaseResult !== 0) return releaseResult;
      }

      // Album Name (A-Z)
      const albumResult = this.sortByAlbumName(a, b);
      if (albumResult !== 0) return albumResult;

      // Disk Number (1, 2, 3...)
      const diskResult = this.sortByDiskNumber(a, b);
      if (diskResult !== 0) return diskResult;

      // Track Position (1, 2, 3...)
      return this.sortByTrackPosition(a, b);
    };
  }

  private static getPrimarySortResult(a: SavedMusic, b: SavedMusic, sortMode: string, isReversed: boolean): number {
    let result = 0;

    switch (sortMode) {
      case 'added':
        result = new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(); // Newest first
        break;
      case 'rating':
        result = b.rating - a.rating; // Highest first
        break;
      case 'release':
        result = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(); // Newest first
        break;
      case 'alphabetical':
        result = a.title.localeCompare(b.title); // A-Z
        break;
      case 'album':
        result = a.album.localeCompare(b.album); // A-Z
        break;
      case 'artist':
        result = a.artist.localeCompare(b.artist); // A-Z
        break;
    }

    return isReversed ? -result : result;
  }

  private static sortByReleaseDate(a: SavedMusic, b: SavedMusic, reversed: boolean = false): number {
    const result = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(); // Newest first
    return reversed ? -result : result;
  }

  private static sortByAlbumName(a: SavedMusic, b: SavedMusic): number {
    return a.album.localeCompare(b.album); // A-Z
  }

  private static sortByDiskNumber(a: SavedMusic, b: SavedMusic): number {
    return a.diskNumber - b.diskNumber; // 1, 2, 3...
  }

  private static sortByTrackPosition(a: SavedMusic, b: SavedMusic): number {
    return a.trackPosition - b.trackPosition; // 1, 2, 3...
  }
}