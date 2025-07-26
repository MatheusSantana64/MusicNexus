// src/services/music/musicCacheService.ts
// Service for caching music API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class CacheService {
  private static readonly DEFAULT_TTL = 10 * 60 * 1000; // Increase to 10 minutes
  private static readonly TRACK_TTL = 30 * 60 * 1000; // 30 minutes for track data
  private static readonly MAX_CACHE_SIZE = 1000; // Increase cache size
  private static readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
  
  private static albumCache = new Map<string, CacheEntry<any>>();
  public static trackCache = new Map<string, CacheEntry<any>>(); // 🔧 Make this public
  private static pendingRequests = new Map<string, PendingRequest<any>>();
  
  private static lastCleanup = Date.now();

  // Generic cache methods
  static set<T>(
    cache: Map<string, CacheEntry<T>>, 
    key: string, 
    data: T, 
    ttl: number = this.DEFAULT_TTL
  ): void {
    this.cleanup();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    
    cache.set(key, entry);
    
    // Prevent memory leaks by limiting cache size
    if (cache.size > this.MAX_CACHE_SIZE) {
      this.evictOldest(cache);
    }
  }

  static get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  // Deduplication: prevent duplicate requests
  static async deduplicate<T>(
    key: string, 
    requestFn: () => Promise<T>,
    ttl: number = 30000 // 30 seconds for pending requests
  ): Promise<T> {
    // Check if there's already a pending request
    const pending = this.pendingRequests.get(key);
    if (pending && (Date.now() - pending.timestamp) < ttl) {
      return pending.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up pending request when done
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  // Album-specific cache methods
  static setAlbum(albumId: string, data: any, ttl?: number): void {
    this.set(this.albumCache, albumId, data, ttl);
  }

  static getAlbum(albumId: string): any | null {
    return this.get(this.albumCache, albumId);
  }

  // Track-specific cache methods
  static setTrack(trackId: string, data: any, ttl?: number): void {
    this.set(this.trackCache, trackId, data, ttl);
  }

  static getTrack(trackId: string): any | null {
    return this.get(this.trackCache, trackId);
  }

  // Batch operations
  static getAlbumsBatch(albumIds: string[]): Map<string, any> {
    const results = new Map<string, any>();
    
    for (const albumId of albumIds) {
      const cached = this.getAlbum(albumId);
      if (cached) {
        results.set(albumId, cached);
      }
    }
    
    return results;
  }

  static setAlbumsBatch(albums: Map<string, any>, ttl?: number): void {
    for (const [albumId, data] of albums) {
      this.setAlbum(albumId, data, ttl);
    }
  }

  // Cache management
  private static evictOldest<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  private static cleanup(): void {
    const now = Date.now();
    
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) {
      return;
    }

    this.lastCleanup = now;
    
    // Clean expired entries
    this.cleanupCache(this.albumCache);
    this.cleanupCache(this.trackCache);
    
    // Clean expired pending requests
    for (const [key, pending] of this.pendingRequests) {
      if (now - pending.timestamp > 60000) { // 1 minute
        this.pendingRequests.delete(key);
      }
    }
  }

  private static cleanupCache<T>(cache: Map<string, CacheEntry<T>>): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      cache.delete(key);
    }
  }

  // Clear all caches (for testing or memory management)
  static clearAll(): void {
    this.albumCache.clear();
    this.trackCache.clear();
    this.pendingRequests.clear();
  }

  // Get cache statistics
  static getStats() {
    return {
      albums: this.albumCache.size,
      tracks: this.trackCache.size,
      pending: this.pendingRequests.size,
      lastCleanup: new Date(this.lastCleanup).toISOString(),
    };
  }
}