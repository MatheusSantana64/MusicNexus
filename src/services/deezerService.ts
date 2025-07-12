import { DeezerSearchResponse, DeezerTrack, DeezerAlbumSearchResponse, DeezerAlbum, SearchMode, SearchOptions } from '../types/music';

const DEEZER_API_URL = 'https://api.deezer.com';

// Cache simples para evitar chamadas repetidas
const albumCache = new Map<string, any>();

export class DeezerService {
  /**
   * Busca principal que delega para o método específico baseado no modo
   */
  static async searchTracks(query: string, mode: SearchMode = 'album', limit: number = 25): Promise<DeezerTrack[]> {
    const options: SearchOptions = { mode, query, limit };
    
    switch (mode) {
      case 'album':
        return this.searchTracksByAlbum(options);
      case 'quick':
        return this.searchTracksQuick(options);
      default:
        return this.searchTracksByAlbum(options);
    }
  }

  /**
   * Modo 1: Pesquisa por álbuns (padrão) - mostra todas as faixas dos álbuns encontrados
   * Álbuns ordenados por data de lançamento (mais recentes primeiro)
   */
  private static async searchTracksByAlbum(options: SearchOptions): Promise<DeezerTrack[]> {
    try {
      if (!options.query || options.query.trim().length === 0) {
        return [];
      }

      const encodedQuery = encodeURIComponent(options.query.trim());
      
      // Primeiro buscar álbuns
      const albumResponse = await fetch(
        `${DEEZER_API_URL}/search/album?q=${encodedQuery}&limit=${Math.min(options.limit || 25, 15)}`
      );

      if (!albumResponse.ok) {
        throw new Error(`HTTP error! status: ${albumResponse.status}`);
      }

      const albumData: DeezerAlbumSearchResponse = await albumResponse.json();
      let albums = albumData.data || [];

      console.log(`[ALBUM MODE] Found ${albums.length} albums`);

      if (albums.length === 0) {
        return [];
      }

      // Enriquecer álbuns com dados detalhados se necessário
      albums = await this.enrichAlbumsWithReleaseData(albums);

      // Ordenar álbuns por data de lançamento (mais recentes primeiro)
      albums.sort((a, b) => {
        if (a.release_date && b.release_date) {
          const dateComparison = new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
          if (dateComparison !== 0) return dateComparison;
        }
        
        // Se apenas um tem data, colocar ele primeiro
        if (a.release_date && !b.release_date) return -1;
        if (!a.release_date && b.release_date) return 1;
        
        // Se nenhum tem data ou são iguais, ordenar por nome do álbum
        return a.title.localeCompare(b.title);
      });

      console.log(`[ALBUM MODE] Albums sorted by release date`);

      // Buscar todas as faixas de cada álbum (já ordenados por data)
      const allTracks: DeezerTrack[] = [];
      
      for (const album of albums) {
        try {
          const albumTracksResponse = await fetch(`${DEEZER_API_URL}/album/${album.id}/tracks`);
          
          if (albumTracksResponse.ok) {
            const albumTracksData = await albumTracksResponse.json();
            const albumTracks = albumTracksData.data || [];
            
            // Enriquecer as tracks com dados do álbum
            const enrichedTracks = albumTracks.map((track: any) => ({
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
              artist: album.artist, // Usar dados do artista do álbum
            }));

            allTracks.push(...enrichedTracks);
          }
        } catch (error) {
          console.warn(`Failed to fetch tracks for album ${album.id}:`, error);
        }
      }

      // Ordenar tracks mantendo a ordem dos álbuns (por data) e depois por posição da faixa
      const sortedTracks = allTracks.sort((a, b) => {
        // 1. Primeiro por data de lançamento do álbum (mais recentes primeiro)
        if (a.album.release_date && b.album.release_date) {
          const dateComparison = new Date(b.album.release_date).getTime() - new Date(a.album.release_date).getTime();
          if (dateComparison !== 0) return dateComparison;
        }
        
        // Se apenas um tem data, colocar ele primeiro
        if (a.album.release_date && !b.album.release_date) return -1;
        if (!a.album.release_date && b.album.release_date) return 1;
        
        // 2. Depois por nome do álbum (para manter consistência)
        const albumComparison = a.album.title.localeCompare(b.album.title);
        if (albumComparison !== 0) return albumComparison;
        
        // 3. Depois por número do disco
        const diskA = a.disk_number || 1;
        const diskB = b.disk_number || 1;
        if (diskA !== diskB) return diskA - diskB;
        
        // 4. Por último por posição da faixa
        const trackPosA = a.track_position || 999;
        const trackPosB = b.track_position || 999;
        return trackPosA - trackPosB;
      });

      console.log(`[ALBUM MODE] Returning ${sortedTracks.length} tracks from ${albums.length} albums (sorted by release date)`);
      return sortedTracks;
    } catch (error) {
      console.error('Error searching tracks by album:', error);
      throw new Error('Falha ao pesquisar álbuns. Verifique sua conexão com a internet.');
    }
  }

  /**
   * Modo 2: Pesquisa rápida do Deezer (sem modificações)
   */
  private static async searchTracksQuick(options: SearchOptions): Promise<DeezerTrack[]> {
    try {
      if (!options.query || options.query.trim().length === 0) {
        return [];
      }

      const encodedQuery = encodeURIComponent(options.query.trim());
      const response = await fetch(
        `${DEEZER_API_URL}/search?q=${encodedQuery}&limit=${options.limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DeezerSearchResponse = await response.json();
      const tracks = data.data || [];

      console.log(`[QUICK MODE] Found ${tracks.length} tracks (original Deezer order)`);
      return tracks;
    } catch (error) {
      console.error('Error searching tracks quick:', error);
      throw new Error('Falha ao pesquisar músicas. Verifique sua conexão com a internet.');
    }
  }

  /**
   * Enriquece álbuns com dados de data de lançamento se necessário
   */
  private static async enrichAlbumsWithReleaseData(albums: DeezerAlbum[]): Promise<DeezerAlbum[]> {
    const enrichedAlbums = await Promise.all(
      albums.map(async (album) => {
        // Se já tem data de lançamento, retornar como está
        if (album.release_date) {
          return album;
        }

        // Verificar cache primeiro
        if (albumCache.has(album.id)) {
          const cachedAlbumData = albumCache.get(album.id);
          return {
            ...album,
            release_date: cachedAlbumData.release_date || '',
          };
        }

        try {
          console.log(`Fetching detailed data for album ${album.id}`);
          const albumResponse = await fetch(`${DEEZER_API_URL}/album/${album.id}`);
          
          if (albumResponse.ok) {
            const albumData = await albumResponse.json();
            
            // Salvar no cache
            albumCache.set(album.id, albumData);
            
            return {
              ...album,
              release_date: albumData.release_date || '',
            };
          }
          
          return album; // Retornar sem modificar se falhou
        } catch (error) {
          console.warn(`Failed to fetch detailed data for album ${album.id}:`, error);
          return album;
        }
      })
    );

    return enrichedAlbums;
  }

  static async getTrackById(trackId: string): Promise<DeezerTrack | null> {
    try {
      const response = await fetch(`${DEEZER_API_URL}/track/${trackId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const track: DeezerTrack = await response.json();
      return track;
    } catch (error) {
      console.error('Error fetching track by ID:', error);
      return null;
    }
  }

  /**
   * Extrai a data de lançamento de uma track
   * Prioriza a data do álbum, depois a data da track
   */
  private static getTrackReleaseDate(track: DeezerTrack): string | null {
    // Primeiro tenta a data do álbum
    if (track.album?.release_date) {
      return track.album.release_date;
    }
    
    // Depois tenta a data da própria track
    if (track.release_date) {
      return track.release_date;
    }
    
    return null;
  }

  /**
   * Formata a data de lançamento para exibição
   */
  static formatReleaseDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
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
   * Obtém a posição da track no álbum
   */
  static getTrackPosition(track: DeezerTrack): string | null {
    if (track.track_position) {
      // Se houver múltiplos discos, mostrar disco.faixa
      if (track.disk_number && track.disk_number > 1) {
        return `${track.disk_number}.${track.track_position}`;
      }
      return track.track_position.toString();
    }
    return null;
  }

  /**
   * Método público para obter a data de lançamento (para uso externo)
   */
  static getTrackReleaseDatePublic(track: DeezerTrack): string | null {
    return this.getTrackReleaseDate(track);
  }

  /**
   * Limpa os caches (útil para testes ou limpeza de memória)
   */
  static clearCaches(): void {
    albumCache.clear();
  }

  /**
   * Obtém descrição do modo de pesquisa
   */
  static getSearchModeDescription(mode: SearchMode): string {
    switch (mode) {
      case 'album':
        return 'Por álbum completo';
      case 'quick':
        return 'Busca rápida';
      default:
        return 'Por álbum completo';
    }
  }
}