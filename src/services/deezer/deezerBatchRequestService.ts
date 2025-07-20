// src/services/deezer/deezerBatchRequestService.ts
// Service for batching requests to the Deezer API
import { CacheService } from '../music/musicCacheService';

// This service batches requests to the Deezer API to reduce the number of calls made, improving performance and reducing load.
interface BatchRequestOptions {
  maxBatchSize: number;
  delayMs: number;
  maxConcurrent: number;
}

interface QueuedRequest<T> {
  id: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class DeezerBatchRequestService {
  private static readonly DEFAULT_OPTIONS: BatchRequestOptions = {
    maxBatchSize: 10,
    delayMs: 100,
    maxConcurrent: 3,
  };

  private static readonly PRIORITY_OPTIONS = {
    maxBatchSize: 5, // Smaller batches for faster response
    delayMs: 50,     // Faster processing
    maxConcurrent: 5, // More concurrent requests
  };

  private static albumQueue: QueuedRequest<any>[] = [];
  private static albumBatchTimeout: NodeJS.Timeout | null = null;
  private static activeRequests = 0;

  // Batch album requests to reduce API calls
  static async requestAlbum(albumId: string, options?: Partial<BatchRequestOptions>): Promise<any> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    return new Promise<any>((resolve, reject) => {
      // Add to queue
      this.albumQueue.push({
        id: albumId,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Process queue if it's full or start timer
      if (this.albumQueue.length >= config.maxBatchSize) {
        this.processAlbumQueue(config);
      } else if (!this.albumBatchTimeout) {
        this.albumBatchTimeout = setTimeout(() => {
          this.processAlbumQueue(config);
        }, config.delayMs);
      }
    });
  }

  // 🚀 NEW: Priority request method
  static async requestAlbumPriority(albumId: string): Promise<any> {
    return this.requestAlbum(albumId, this.PRIORITY_OPTIONS);
  }

  private static async processAlbumQueue(options: BatchRequestOptions): Promise<void> {
    if (this.albumBatchTimeout) {
      clearTimeout(this.albumBatchTimeout);
      this.albumBatchTimeout = null;
    }

    if (this.albumQueue.length === 0) return;

    // Wait if too many concurrent requests
    if (this.activeRequests >= options.maxConcurrent) {
      setTimeout(() => this.processAlbumQueue(options), 100);
      return;
    }

    // Take a batch from the queue
    const batch = this.albumQueue.splice(0, options.maxBatchSize);
    if (batch.length === 0) return;

    this.activeRequests++;
    
    console.log(`📦 Processing album batch: ${batch.length} requests`);

    try {
      await this.fetchAlbumBatch(batch);
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.activeRequests--;
      
      // Process remaining queue
      if (this.albumQueue.length > 0) {
        setTimeout(() => this.processAlbumQueue(options), 50);
      }
    }
  }

  private static async fetchAlbumBatch(batch: QueuedRequest<any>[]): Promise<void> {
    const albumIds = batch.map(req => req.id);
    const cached = CacheService.getAlbumsBatch(albumIds);
    
    // Separate cached and non-cached requests
    const cachedRequests: QueuedRequest<any>[] = [];
    const uncachedRequests: QueuedRequest<any>[] = [];
    
    for (const request of batch) {
      if (cached.has(request.id)) {
        cachedRequests.push(request);
      } else {
        uncachedRequests.push(request);
      }
    }

    // Resolve cached requests immediately
    for (const request of cachedRequests) {
      request.resolve(cached.get(request.id));
    }

    if (uncachedRequests.length === 0) {
      console.log(`✅ All ${batch.length} albums served from cache`);
      return;
    }

    console.log(`🌐 Fetching ${uncachedRequests.length} albums from API (${cachedRequests.length} from cache)`);

    // Fetch uncached albums with controlled concurrency
    const chunks = this.chunkArray(uncachedRequests, 3); // Max 3 simultaneous requests
    
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (request) => {
          try {
            const albumData = await this.fetchSingleAlbum(request.id);
            CacheService.setAlbum(request.id, albumData);
            request.resolve(albumData);
          } catch (error) {
            request.reject(error instanceof Error ? error : new Error('Unknown error'));
          }
        })
      );
    }
  }

  private static async fetchSingleAlbum(albumId: string): Promise<any> {
    const DEEZER_API_URL = 'https://api.deezer.com';
    
    // Use deduplication to prevent duplicate requests
    return CacheService.deduplicate(
      `album-${albumId}`,
      async () => {
        const response = await fetch(`${DEEZER_API_URL}/album/${albumId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch album ${albumId}: ${response.status}`);
        }
        
        return response.json();
      }
    );
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Clear queue (for testing or cleanup)
  static clearQueue(): void {
    this.albumQueue = [];
    if (this.albumBatchTimeout) {
      clearTimeout(this.albumBatchTimeout);
      this.albumBatchTimeout = null;
    }
  }

  // Get queue status
  static getQueueStatus() {
    return {
      queueSize: this.albumQueue.length,
      activeRequests: this.activeRequests,
      hasPendingBatch: !!this.albumBatchTimeout,
    };
  }
}