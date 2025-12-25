/**
 * Simple in-memory cache with TTL support
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttl?: number;
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory LRU cache with TTL support
 * 
 * @example
 * ```ts
 * const cache = new Cache<GeocodeResult[]>({ ttl: 3600000 }); // 1 hour
 * cache.set('key', results);
 * const cached = cache.get('key');
 * ```
 */
export class Cache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 60 * 60 * 1000; // 1 hour default
    this.maxSize = options.maxSize ?? 1000;
  }

  /**
   * Get a value from the cache
   * @returns The cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end for LRU behavior
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL override in milliseconds
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.ttl),
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

/**
 * Generate a cache key from geocoding parameters
 */
export function createCacheKey(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

  return JSON.stringify(sorted);
}

