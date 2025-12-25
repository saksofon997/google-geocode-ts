import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { Cache, createCacheKey } from './cache.js';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({ ttl: 1000, maxSize: 3 });
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      assert.strictEqual(cache.get('key1'), 'value1');
    });

    it('should return undefined for missing keys', () => {
      assert.strictEqual(cache.get('nonexistent'), undefined);
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      assert.strictEqual(cache.get('key1'), 'value2');
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new Cache<string>({ ttl: 50 });
      shortCache.set('key1', 'value1');
      
      assert.strictEqual(shortCache.get('key1'), 'value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));
      
      assert.strictEqual(shortCache.get('key1'), undefined);
    });

    it('should respect custom TTL per entry', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      
      assert.strictEqual(cache.get('key1'), 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      assert.strictEqual(cache.get('key1'), undefined);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1
      
      assert.strictEqual(cache.get('key1'), undefined);
      assert.strictEqual(cache.get('key2'), 'value2');
      assert.strictEqual(cache.get('key3'), 'value3');
      assert.strictEqual(cache.get('key4'), 'value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1, making it most recently used
      cache.get('key1');
      
      // Add new entry, should evict key2 (now oldest)
      cache.set('key4', 'value4');
      
      assert.strictEqual(cache.get('key1'), 'value1');
      assert.strictEqual(cache.get('key2'), undefined);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      assert.strictEqual(cache.has('key1'), true);
    });

    it('should return false for missing keys', () => {
      assert.strictEqual(cache.has('nonexistent'), false);
    });

    it('should return false for expired keys', async () => {
      const shortCache = new Cache<string>({ ttl: 50 });
      shortCache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      assert.strictEqual(shortCache.has('key1'), false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('key1', 'value1');
      assert.strictEqual(cache.delete('key1'), true);
      assert.strictEqual(cache.get('key1'), undefined);
    });

    it('should return false for missing keys', () => {
      assert.strictEqual(cache.delete('nonexistent'), false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      assert.strictEqual(cache.size, 0);
      assert.strictEqual(cache.get('key1'), undefined);
      assert.strictEqual(cache.get('key2'), undefined);
    });
  });

  describe('size', () => {
    it('should return the number of entries', () => {
      assert.strictEqual(cache.size, 0);
      
      cache.set('key1', 'value1');
      assert.strictEqual(cache.size, 1);
      
      cache.set('key2', 'value2');
      assert.strictEqual(cache.size, 2);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      const shortCache = new Cache<string>({ ttl: 50, maxSize: 10 });
      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2', 200); // Longer TTL
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const pruned = shortCache.prune();
      
      assert.strictEqual(pruned, 1);
      assert.strictEqual(shortCache.get('key1'), undefined);
      assert.strictEqual(shortCache.get('key2'), 'value2');
    });
  });
});

describe('createCacheKey', () => {
  it('should create consistent keys for same params', () => {
    const key1 = createCacheKey({ a: 1, b: 2 });
    const key2 = createCacheKey({ b: 2, a: 1 });
    
    assert.strictEqual(key1, key2);
  });

  it('should exclude null and undefined values', () => {
    const key1 = createCacheKey({ a: 1, b: undefined, c: null });
    const key2 = createCacheKey({ a: 1 });
    
    assert.strictEqual(key1, key2);
  });

  it('should create different keys for different params', () => {
    const key1 = createCacheKey({ a: 1 });
    const key2 = createCacheKey({ a: 2 });
    
    assert.notStrictEqual(key1, key2);
  });

  it('should handle nested objects', () => {
    const key = createCacheKey({ 
      latlng: { lat: 37.42, lng: -122.08 },
      language: 'en'
    });
    
    assert.strictEqual(typeof key, 'string');
    assert.ok(key.includes('37.42'));
  });
});

