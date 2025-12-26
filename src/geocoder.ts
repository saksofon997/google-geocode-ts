import type {
  GeocoderConfig,
  GeocodeOptions,
  ReverseGeocodeOptions,
  GeocodeResult,
  LatLng,
  RawGeocodeResponse,
  RawGeocodeResult,
  RawAddressComponent,
  RawGeometry,
  RawPlusCode,
} from "./types.js";
import {
  GeocodingError,
  ApiKeyError,
  InvalidRequestError,
  NetworkError,
} from "./errors.js";
import { Cache, createCacheKey, type CacheOptions } from "./cache.js";
import { RateLimiter, type RateLimiterOptions } from "./rateLimiter.js";

const DEFAULT_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const DEFAULT_TIMEOUT = 10_000;

/**
 * Extended configuration options for the Geocoder client
 */
export type GeocoderConfigWithFeatures = {
  /**
   * Cache configuration. Set to false to disable caching.
   * Default: enabled with 1 hour TTL
   */
  cache?: CacheOptions | false;
  /**
   * Rate limiter configuration. Set to false to disable rate limiting.
   * Default: enabled with 50 requests/second
   */
  rateLimiter?: RateLimiterOptions | false;
} & GeocoderConfig;

/**
 * Modern ESM client for Google Geocoding API
 *
 * @example
 * ```ts
 * import { Geocoder } from '@your-scope/geocode';
 *
 * const geocoder = new Geocoder({ apiKey: 'YOUR_API_KEY' });
 *
 * // Geocode an address
 * const results = await geocoder.geocode({ address: '1600 Amphitheatre Parkway' });
 *
 * // Reverse geocode coordinates
 * const address = await geocoder.reverseGeocode({ latlng: { lat: 37.4224764, lng: -122.0842499 } });
 * ```
 *
 * @example
 * ```ts
 * // With custom cache and rate limiter settings
 * const geocoder = new Geocoder({
 *   apiKey: 'YOUR_API_KEY',
 *   cache: { ttl: 3600000, maxSize: 500 },    // 1 hour TTL, 500 entries max
 *   rateLimiter: { maxRequests: 10, interval: 1000 }, // 10 req/sec
 * });
 * ```
 *
 * @example
 * ```ts
 * // Disable caching and rate limiting
 * const geocoder = new Geocoder({
 *   apiKey: 'YOUR_API_KEY',
 *   cache: false,
 *   rateLimiter: false,
 * });
 * ```
 */
export class Geocoder {
  private readonly config: Required<
    Pick<GeocoderConfig, "apiKey" | "baseUrl" | "timeout">
  > &
    Pick<GeocoderConfig, "language" | "region">;

  private readonly cache: Cache<GeocodeResult[]> | null;
  private readonly rateLimiter: RateLimiter | null;

  constructor(config: GeocoderConfigWithFeatures) {
    if (!config.apiKey) {
      throw new InvalidRequestError("API key is required");
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      language: config.language,
      region: config.region,
    };

    // Initialize cache (enabled by default)
    this.cache =
      config.cache === false ? null : new Cache<GeocodeResult[]>(config.cache);

    // Initialize rate limiter (enabled by default)
    this.rateLimiter =
      config.rateLimiter === false ? null : new RateLimiter(config.rateLimiter);
  }

  /**
   * Geocode an address to coordinates
   *
   * @param options - Geocoding options including the address
   * @returns Array of geocode results (empty array if no results found)
   * @throws {InvalidRequestError} When address is missing or invalid
   * @throws {ApiKeyError} When API key is invalid or quota exceeded
   * @throws {NetworkError} On network failures
   */
  async geocode(options: GeocodeOptions): Promise<GeocodeResult[]> {
    const hasAddress =
      typeof options.address === "string" && options.address.trim().length > 0;
    const hasComponents =
      options.components !== undefined &&
      options.components !== null &&
      Object.keys(options.components).length > 0;

    if (!hasAddress && !hasComponents) {
      throw new InvalidRequestError(
        "Either address or components is required for geocoding"
      );
    }

    const parameters = new URLSearchParams({ key: this.config.apiKey });
    if (hasAddress) {
      parameters.set("address", options.address!.trim());
    }

    // Add optional parameters
    const language = options.language ?? this.config.language;
    if (language) {
      parameters.set("language", language);
    }

    const region = options.region ?? this.config.region;
    if (region) {
      parameters.set("region", region);
    }

    if (options.components) {
      const componentString = Object.entries(options.components)
        .map(([key, value]) => `${key}:${value}`)
        .join("|");
      parameters.set("components", componentString);
    }

    if (options.bounds) {
      const boundsString = `${options.bounds.southwest.lat},${options.bounds.southwest.lng}|${options.bounds.northeast.lat},${options.bounds.northeast.lng}`;
      parameters.set("bounds", boundsString);
    }

    // Create cache key (excluding API key)
    const cacheKey = createCacheKey({
      type: "geocode",
      address: hasAddress ? options.address!.trim() : undefined,
      language,
      region,
      components: options.components,
      bounds: options.bounds,
    });

    return this.requestWithCacheAndRateLimit(parameters, cacheKey);
  }

  /**
   * Reverse geocode coordinates to an address
   *
   * @param options - Reverse geocoding options including lat/lng
   * @returns Array of geocode results (empty array if no results found)
   * @throws {InvalidRequestError} When coordinates are invalid
   * @throws {ApiKeyError} When API key is invalid or quota exceeded
   * @throws {NetworkError} On network failures
   */
  async reverseGeocode(
    options: ReverseGeocodeOptions
  ): Promise<GeocodeResult[]> {
    if (!this.isValidLatLng(options.latlng)) {
      throw new InvalidRequestError(
        "Valid latitude and longitude are required"
      );
    }

    const parameters = new URLSearchParams({
      latlng: `${options.latlng.lat},${options.latlng.lng}`,
      key: this.config.apiKey,
    });

    // Add optional parameters
    const language = options.language ?? this.config.language;
    if (language) {
      parameters.set("language", language);
    }

    if (options.resultType?.length) {
      parameters.set("result_type", options.resultType.join("|"));
    }

    if (options.locationType?.length) {
      parameters.set("location_type", options.locationType.join("|"));
    }

    // Create cache key (excluding API key)
    const cacheKey = createCacheKey({
      type: "reverse",
      latlng: options.latlng,
      language,
      resultType: options.resultType,
      locationType: options.locationType,
    });

    return this.requestWithCacheAndRateLimit(parameters, cacheKey);
  }

  /**
   * Get coordinates for an address (convenience method)
   *
   * @param address - The address to geocode
   * @returns The coordinates of the first result, or null if no results found
   */
  async getCoordinates(address: string): Promise<LatLng | null> {
    const results = await this.geocode({ address });

    if (results.length === 0) {
      return null;
    }

    return results[0].geometry.location;
  }

  /**
   * Get formatted address for coordinates (convenience method)
   *
   * @param latlng - The coordinates to reverse geocode
   * @returns The formatted address of the first result, or null if no results found
   */
  async getAddress(latlng: LatLng): Promise<string | null> {
    const results = await this.reverseGeocode({ latlng });

    if (results.length === 0) {
      return null;
    }

    return results[0].formattedAddress;
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache?.size ?? 0,
      enabled: this.cache !== null,
    };
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats(): {
    availableTokens: number;
    queueSize: number;
    enabled: boolean;
  } {
    return {
      availableTokens: this.rateLimiter?.getAvailableTokens() ?? 0,
      queueSize: this.rateLimiter?.getQueueSize() ?? 0,
      enabled: this.rateLimiter !== null,
    };
  }

  /**
   * Dispose of resources (rate limiter timers)
   */
  dispose(): void {
    this.rateLimiter?.dispose();
    this.cache?.clear();
  }

  /**
   * Make request with caching and rate limiting
   */
  private async requestWithCacheAndRateLimit(
    parameters: URLSearchParams,
    cacheKey: string
  ): Promise<GeocodeResult[]> {
    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Apply rate limiting
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    // Make the request
    const results = await this.request(parameters);

    // Cache the results
    if (this.cache && results.length > 0) {
      this.cache.set(cacheKey, results);
    }

    return results;
  }

  /**
   * Make the API request
   */
  private async request(parameters: URLSearchParams): Promise<GeocodeResult[]> {
    const url = `${this.config.baseUrl}?${parameters.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as RawGeocodeResponse;

      return this.handleResponse(data);
    } catch (error) {
      if (error instanceof GeocodingError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new NetworkError("Request timed out", error);
        }

        throw new NetworkError(`Request failed: ${error.message}`, error);
      }

      throw new NetworkError("An unknown error occurred");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle the API response and throw appropriate errors
   */
  private handleResponse(response: RawGeocodeResponse): GeocodeResult[] {
    switch (response.status) {
      case "OK": {
        return response.results.map((r) => this.toGeocodeResult(r));
      }

      case "ZERO_RESULTS": {
        return [];
      }

      case "OVER_DAILY_LIMIT":
      case "OVER_QUERY_LIMIT": {
        throw new ApiKeyError(
          response.error_message ?? "API quota exceeded",
          response.status
        );
      }

      case "REQUEST_DENIED": {
        throw new ApiKeyError(
          response.error_message ?? "Request denied - check your API key",
          response.status
        );
      }

      case "INVALID_REQUEST": {
        throw new InvalidRequestError(
          response.error_message ?? "Invalid request"
        );
      }

      default: {
        throw new GeocodingError(
          response.error_message ?? "An unknown error occurred",
          response.status
        );
      }
    }
  }

  private toGeocodeResult(raw: RawGeocodeResult): GeocodeResult {
    return {
      addressComponents: raw.address_components.map((c) =>
        this.toAddressComponent(c)
      ),
      formattedAddress: raw.formatted_address,
      geometry: this.toGeometry(raw.geometry),
      placeId: raw.place_id,
      plusCode: raw.plus_code ? this.toPlusCode(raw.plus_code) : undefined,
      postcodeLocalities: raw.postcode_localities,
      types: raw.types,
      partialMatch: raw.partial_match,
    };
  }

  private toAddressComponent(raw: RawAddressComponent) {
    return {
      longName: raw.long_name,
      shortName: raw.short_name,
      types: raw.types,
    };
  }

  private toGeometry(raw: RawGeometry) {
    return {
      location: raw.location,
      locationType: raw.location_type,
      viewport: raw.viewport,
      bounds: raw.bounds,
    };
  }

  private toPlusCode(raw: RawPlusCode) {
    return {
      globalCode: raw.global_code,
      compoundCode: raw.compound_code,
    };
  }

  /**
   * Validate latitude/longitude coordinates
   */
  private isValidLatLng(latlng: LatLng): boolean {
    return (
      typeof latlng?.lat === "number" &&
      typeof latlng?.lng === "number" &&
      latlng.lat >= -90 &&
      latlng.lat <= 90 &&
      latlng.lng >= -180 &&
      latlng.lng <= 180
    );
  }
}
