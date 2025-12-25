import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RateLimiter, RateLimitError } from './rate-limiter.js';

describe('RateLimiter', () => {
  describe('tryAcquire', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      assert.strictEqual(limiter.tryAcquire(), true);
      assert.strictEqual(limiter.tryAcquire(), true);
      assert.strictEqual(limiter.tryAcquire(), true);
    });

    it('should deny requests over limit', () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      
      assert.strictEqual(limiter.tryAcquire(), false);
    });

    it('should refill tokens after interval', async () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      
      // Use all tokens
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      
      assert.strictEqual(limiter.tryAcquire(), false);
      
      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 110));
      
      assert.strictEqual(limiter.tryAcquire(), true);
    });
  });

  describe('acquire (with queue disabled)', () => {
    it('should throw when limit exceeded', async () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      
      await assert.rejects(
        () => limiter.acquire(),
        RateLimitError
      );
    });
  });

  describe('getAvailableTokens', () => {
    it('should return remaining tokens', () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      
      assert.strictEqual(limiter.getAvailableTokens(), 3);
      
      limiter.tryAcquire();
      assert.strictEqual(limiter.getAvailableTokens(), 2);
      
      limiter.tryAcquire();
      assert.strictEqual(limiter.getAvailableTokens(), 1);
    });
  });

  describe('getQueueSize', () => {
    it('should return zero for non-queuing limiter', () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      assert.strictEqual(limiter.getQueueSize(), 0);
    });
  });

  describe('reset', () => {
    it('should reset tokens to max', () => {
      const limiter = new RateLimiter({ maxRequests: 3, interval: 100, queue: false });
      
      limiter.tryAcquire();
      limiter.tryAcquire();
      
      assert.strictEqual(limiter.getAvailableTokens(), 1);
      
      limiter.reset();
      
      assert.strictEqual(limiter.getAvailableTokens(), 3);
    });
  });

  describe('default options', () => {
    it('should use sensible defaults', () => {
      const limiter = new RateLimiter();
      
      // Default is 50 requests per second
      assert.strictEqual(limiter.getAvailableTokens(), 50);
    });
  });
});
