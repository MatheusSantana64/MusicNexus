import { DeezerSearchResponse, DeezerTrack, DeezerAlbumSearchResponse, DeezerAlbum, SearchMode, SearchOptions } from '../types/music';
import { compareDates } from '../utils/dateUtils';

// === CONSTANTS & CONFIGURATION ===
const DEEZER_API_URL = 'https://api.deezer.com';
const albumCache = new Map<string, any>();

export class DeezerService {
  // === PUBLIC API METHODS ===
  
  /**
   * Busca principal que delega para o método específico baseado no modo
   */
  static async searchTracks(query: string, mode: SearchMode = 'album', limit: number = 25): Promise<DeezerTrack[]> {
    const options: SearchOptions = { mode, query, limit };
    
    const searchMethods = {
      album: this.searchTracksByAlbum,
      quick: this.searchTracksQuick,
    };
    
    return (searchMethods[mode] || searchMethods.album).call(this, options);
  }

  static async getTrackById(trackId: string): Promise<DeezerTrack | null> {
    try {
      const response = await fetch(`${DEEZER_API_URL}/track/${trackId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }

  // === SEARCH IMPLEMENTATIONS ===

  /**
   * Modo 1: Pesquisa por álbuns (padrão) - mostra todas as faixas dos álbuns encontrados
   * Álbuns ordenados por data de lançamento (mais recentes primeiro)
   */
  private static async searchTracksByAlbum(options: SearchOptions): Promise<DeezerTrack[]> {
    try {
      if (!options.query?.trim()) return [];

      const albums = await this.fetchAndSortAlbums(options);
      if (albums.length === 0) return [];

      const allTracks = await this.fetchTracksFromAlbums(albums);
      return this.sortTracksByAlbumOrder(allTracks);
    } catch (error) {
      console.error('Error searching tracks by album:', error);
      throw new Error('Falha ao pesquisar álbuns. Verifique sua conexão com a internet.');
    }
  }

  /**
   * Modo 2: Pesquisa rápida do Deezer (com enriquecimento de dados)
   */
  private static async searchTracksQuick(options: SearchOptions): Promise<DeezerTrack[]> {
    try {
      if (!options.query?.trim()) return [];

      const encodedQuery = encodeURIComponent(options.query.trim());
      const response = await fetch(`${DEEZER_API_URL}/search?q=${encodedQuery}&limit=${options.limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DeezerSearchResponse = await response.json();
      let tracks = data.data || [];

      console.log(`[QUICK MODE] Found ${tracks.length} tracks`);
      
      // Enriquecer tracks com dados completos do álbum
      tracks = await this.enrichTracksWithAlbumData(tracks);
      
      return tracks;
    } catch (error) {
      console.error('Error searching tracks quick:', error);
      throw new Error('Falha ao pesquisar músicas. Verifique sua conexão com a internet.');
    }
  }

  // === ALBUM PROCESSING ===

  private static async fetchAndSortAlbums(options: SearchOptions): Promise<DeezerAlbum[]> {
    const encodedQuery = encodeURIComponent(options.query.trim());
    const albumResponse = await fetch(
      `${DEEZER_API_URL}/search/album?q=${encodedQuery}&limit=${Math.min(options.limit || 25, 15)}`
    );

    if (!albumResponse.ok) {
      throw new Error(`HTTP error! status: ${albumResponse.status}`);
    }

    const albumData: DeezerAlbumSearchResponse = await albumResponse.json();
    let albums = albumData.data || [];

    console.log(`[ALBUM MODE] Found ${albums.length} albums`);

    // Enrich and sort albums
    albums = await this.enrichAlbumsWithReleaseData(albums);
    return this.sortAlbumsByReleaseDate(albums);
  }

  private static async fetchTracksFromAlbums(albums: DeezerAlbum[]): Promise<DeezerTrack[]> {
    const allTracks: DeezerTrack[] = [];
    
    for (const album of albums) {
      try {
        const albumTracksResponse = await fetch(`${DEEZER_API_URL}/album/${album.id}/tracks`);
        
        if (albumTracksResponse.ok) {
          const albumTracksData = await albumTracksResponse.json();
          const enrichedTracks = (albumTracksData.data || []).map((track: any) => 
            this.enrichTrackWithAlbumData(track, album)
          );
          allTracks.push(...enrichedTracks);
        }
      } catch (error) {
        console.warn(`Failed to fetch tracks for album ${album.id}:`, error);
      }
    }

    return allTracks;
  }

  // === SORTING UTILITIES ===

  private static sortAlbumsByReleaseDate(albums: DeezerAlbum[]): DeezerAlbum[] {
    return albums.sort((a, b) => {
      // Use existing date comparison utility
      if (a.release_date && b.release_date) {
        const dateComparison = compareDates(b.release_date, a.release_date); // Reverse for newest first
        if (dateComparison !== 0) return dateComparison;
      }
      
      // Fallback logic
      if (a.release_date && !b.release_date) return -1;
      if (!a.release_date && b.release_date) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  private static sortTracksByAlbumOrder(tracks: DeezerTrack[]): DeezerTrack[] {
    return tracks.sort((a, b) => {
      // 1. Album release date (newest first)
      if (a.album.release_date && b.album.release_date) {
        const dateComparison = compareDates(b.album.release_date, a.album.release_date);
        if (dateComparison !== 0) return dateComparison;
      }
      
      if (a.album.release_date && !b.album.release_date) return -1;
      if (!a.album.release_date && b.album.release_date) return 1;
      
      // 2. Album name
      const albumComparison = a.album.title.localeCompare(b.album.title);
      if (albumComparison !== 0) return albumComparison;
      
      // 3. Disk number
      const diskA = a.disk_number || 1;
      const diskB = b.disk_number || 1;
      if (diskA !== diskB) return diskA - diskB;
      
      // 4. Track position
      const trackPosA = a.track_position || 999;
      const trackPosB = b.track_position || 999;
      return trackPosA - trackPosB;
    });
  }

  // === DATA ENRICHMENT ===

  private static enrichTrackWithAlbumData(track: any, album: DeezerAlbum): DeezerTrack {
    return {
      ...track,
      album: {
        id: album.id,
        title: album.title,
        cover: album.cover,
        cover_small: album.cover_small,
        cover_medium: album.cover_medium,
        cover_big: album.cover_big,
        release_date: album.release_date,
      },
      artist: album.artist,
    };
  }

  private static async enrichAlbumsWithReleaseData(albums: DeezerAlbum[]): Promise<DeezerAlbum[]> {
    return Promise.all(
      albums.map(async (album) => {
        if (album.release_date) return album;

        // Check cache first
        if (albumCache.has(album.id)) {
          const cachedData = albumCache.get(album.id);
          return { ...album, release_date: cachedData.release_date || '' };
        }

        try {
          const albumResponse = await fetch(`${DEEZER_API_URL}/album/${album.id}`);
          
          if (albumResponse.ok) {
            const albumData = await albumResponse.json();
            albumCache.set(album.id, albumData);
            return { ...album, release_date: albumData.release_date || '' };
          }
        } catch (error) {
          console.warn(`Failed to fetch detailed data for album ${album.id}:`, error);
        }

        return album;
      })
    );
  }

  // Enriquece tracks individuais com dados do álbum
  private static async enrichTracksWithAlbumData(tracks: DeezerTrack[]): Promise<DeezerTrack[]> {
    const albumIds = new Set<string>();
    const albumDataMap = new Map<string, any>();

    // Coletar IDs únicos dos álbuns
    tracks.forEach(track => {
      if (track.album?.id) {
        albumIds.add(track.album.id);
      }
    });

    // Buscar dados completos dos álbuns
    await Promise.all(
      Array.from(albumIds).map(async (albumId) => {
        try {
          // Verificar cache primeiro
          if (albumCache.has(albumId)) {
            albumDataMap.set(albumId, albumCache.get(albumId));
            return;
          }

          const albumResponse = await fetch(`${DEEZER_API_URL}/album/${albumId}`);
          if (albumResponse.ok) {
            const albumData = await albumResponse.json();
            albumCache.set(albumId, albumData);
            albumDataMap.set(albumId, albumData);
          }
        } catch (error) {
          console.warn(`Failed to fetch album data for ${albumId}:`, error);
        }
      })
    );

    // Enriquecer tracks com dados completos do álbum
    return tracks.map(track => {
      const albumData = albumDataMap.get(track.album?.id);
      if (albumData) {
        return {
          ...track,
          album: {
            ...track.album,
            release_date: albumData.release_date || track.album.release_date,
          }
        };
      }
      return track;
    });
  }

  // === PUBLIC UTILITIES ===

  /**
   * Extrai a data de lançamento de uma track
   * Prioriza a data do álbum, depois a data da track
   */
  static getTrackReleaseDate(track: DeezerTrack): string | null {
    return track.album?.release_date || track.release_date || null;
  }

  /**
   * Obtém a posição da track no álbum
   */
  static getTrackPosition(track: DeezerTrack): string | null {
    if (!track.track_position) return null;
    
    const position = track.track_position.toString();
    return track.disk_number && track.disk_number > 1 
      ? `${track.disk_number}.${position}` 
      : position;
  }

  /**
   * Obtém o ano de lançamento de uma track
   */
  static getReleaseYear(track: DeezerTrack): string | null {
    const releaseDate = this.getTrackReleaseDate(track);
    if (!releaseDate) return null;
    
    try {
      return new Date(releaseDate).getFullYear().toString();
    } catch {
      return releaseDate.split('-')[0] || null;
    }
  }

  /**
   * Obtém descrição do modo de pesquisa
   */
  static getSearchModeDescription(mode: SearchMode): string {
    const descriptions = {
      album: 'Por álbum completo',
      quick: 'Busca rápida',
    };
    return descriptions[mode] || descriptions.album;
  }

  // === CACHE MANAGEMENT ===

  /**
   * Limpa os caches (útil para testes ou limpeza de memória)
   */
  static clearCaches(): void {
    albumCache.clear();
  }
}