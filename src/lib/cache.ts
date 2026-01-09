/**
 * Simple in-memory cache service.
 * 
 * Used to reduce database queries for frequently accessed library data
 * like lists of artists, albums, and tracks.
 * 
 * @module cache
 */

/**
 * Standard cache keys used across the application.
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

/**
 * Service to handle in-memory caching of data.
 */
class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  // Optional TTL, currently not strictly enforced as we validate on write
  // private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get an item from the cache.
   * 
   * @param key - The cache key to retrieve
   * @returns The cached data or null if not found
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  /**
   * Set an item in the cache.
   * 
   * @param key - The cache key to set
   * @param data - The data to store
   */
  public set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate a specific cache key.
   * 
   * @param key - The cache key to remove
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache keys.
   * 
   * Should be called when the library is updated (add/delete/modify)
   * to ensure fresh data is fetched next time.
   */
  public clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
