// src/Profile/profileStatsUtils.ts
// Utility functions for calculating profile statistics
import { SavedMusic, Tag } from '../types';

export interface ProfileStats {
  totalSongs: number;
  totalAlbums: number;
  totalArtists: number;
  avgRating: string;
  ratingCounts: Record<string, number>;
  yearCounts: Record<string, number>;
  tagCounts: Record<string, number>;
}

export function calculateProfileStats(savedMusic: SavedMusic[], tags: Tag[]): ProfileStats {
  const totalSongs = savedMusic.length;
  const albumSet = new Set(savedMusic.map(m => m.albumId));
  const totalAlbums = albumSet.size;
  const artistSet = new Set(savedMusic.map(m => m.artist));
  const totalArtists = artistSet.size;
  const ratings = savedMusic.map(m => m.rating).filter(r => r > 0);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
    : 'N/A';

  // Ratings column
  const ratingCounts: Record<string, number> = {};
  for (let r = 0; r <= 10; r += 0.5) {
    ratingCounts[r.toFixed(1)] = 0;
  }
  savedMusic.forEach(m => {
    if (m.rating !== undefined && m.rating !== null) {
      const key = m.rating.toFixed(1);
      if (ratingCounts[key] !== undefined) {
        ratingCounts[key]++;
      }
    }
  });

  // Year column
  const yearCounts: Record<string, number> = {};
  savedMusic.forEach(m => {
    const year = m.releaseDate ? new Date(m.releaseDate).getFullYear().toString() : 'Unknown';
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });

  // Tags column (by name)
  const tagCounts: Record<string, number> = {};
  savedMusic.forEach(m => {
    if (Array.isArray(m.tags)) {
      m.tags.forEach(tagId => {
        const tagObj = tags.find(t => t.id === tagId);
        const tagName = tagObj ? tagObj.name : tagId;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  return { totalSongs, totalAlbums, totalArtists, avgRating, ratingCounts, yearCounts, tagCounts };
}