/**
 * Simple in-memory cache service
 * Used to reduce database queries for static library data
 */

export const CACHE_KEYS = {
  ALL_ARTISTS: 'artists:all',
  ALL_ALBUMS: 'albums:all',
  ALL_TRACKS: 'tracks:all',
  TRACKS_WITH_RELATIONS: 'tracks:relations',
  ALL_PLAYLISTS: 'playlists:all',
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  // Optional TTL, currently not strictly enforced as we validate on write
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get item from cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  public set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate specific key
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys (use on library updates)
   */
  public clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
