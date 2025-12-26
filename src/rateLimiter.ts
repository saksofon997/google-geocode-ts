/**
 * Rate limiter options
 */
export type RateLimiterOptions = {
  /** Maximum requests per interval (default: 50) */
  maxRequests?: number;
  /** Interval in milliseconds (default: 1000 = 1 second) */
  interval?: number;
  /** Whether to queue requests when limit is reached (default: true) */
  queue?: boolean;
  /** Maximum queue size (default: 100) */
  maxQueueSize?: number;
};

type QueuedRequest = {
  resolve: () => void;
  reject: (error: Error) => void;
};

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Token bucket rate limiter with optional request queuing
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({ maxRequests: 50, interval: 1000 });
 *
 * // Will wait if rate limited (when queue: true)
 * await limiter.acquire();
 * // Make your API call here
 * ```
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly interval: number;
  private readonly shouldQueue: boolean;
  private readonly maxQueueSize: number;

  private tokens: number;
  private lastRefill: number;
  private readonly queue: QueuedRequest[] = [];
  private refillTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimiterOptions = {}) {
    this.maxRequests = options.maxRequests ?? 50;
    this.interval = options.interval ?? 1000;
    this.shouldQueue = options.queue ?? true;
    this.maxQueueSize = options.maxQueueSize ?? 100;

    this.tokens = this.maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   * @throws {RateLimitError} When queue is disabled or full
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    if (!this.shouldQueue) {
      throw new RateLimitError();
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new RateLimitError("Rate limit queue is full");
    }

    // Start the refill timer if not running
    this.startRefillTimer();

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  /**
   * Try to acquire a token without waiting
   * @returns true if token was acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get the current number of available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get the number of requests waiting in queue
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxRequests;
    this.lastRefill = Date.now();
    this.stopRefillTimer();

    // Reject all queued requests
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      request?.reject(new RateLimitError("Rate limiter was reset"));
    }
  }

  /**
   * Dispose of the rate limiter and clean up
   */
  dispose(): void {
    this.reset();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.interval) {
      const intervals = Math.floor(elapsed / this.interval);
      this.tokens = Math.min(
        this.maxRequests,
        this.tokens + intervals * this.maxRequests
      );
      this.lastRefill = now - (elapsed % this.interval);

      // Process queued requests
      this.processQueue();
    }
  }

  /**
   * Process queued requests if tokens are available
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.tokens > 0) {
      const request = this.queue.shift();
      if (request) {
        this.tokens--;
        request.resolve();
      }
    }

    // Stop timer if queue is empty
    if (this.queue.length === 0) {
      this.stopRefillTimer();
    }
  }

  /**
   * Start the refill timer for processing queued requests
   */
  private startRefillTimer(): void {
    if (this.refillTimer !== null) {
      return;
    }

    this.refillTimer = setInterval(() => {
      this.refill();
    }, this.interval);

    // Unref the timer so it doesn't keep the process alive
    if (typeof this.refillTimer === "object" && "unref" in this.refillTimer) {
      this.refillTimer.unref();
    }
  }

  /**
   * Stop the refill timer
   */
  private stopRefillTimer(): void {
    if (this.refillTimer !== null) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
  }
}
