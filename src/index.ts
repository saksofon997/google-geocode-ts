/**
 * Modern ESM wrapper for Google Geocoding API
 * @packageDocumentation
 */

// Main geocoder
export { Geocoder, type GeocoderConfigWithFeatures } from "./geocoder.js";

// Errors
export {
  GeocodingError,
  ApiKeyError,
  InvalidRequestError,
  NetworkError,
} from "./errors.js";

// Cache
export { Cache, createCacheKey, type CacheOptions } from "./cache.js";

// Rate limiter
export {
  RateLimiter,
  RateLimitError,
  type RateLimiterOptions,
} from "./rateLimiter.js";

// Types
export type {
  GeocoderConfig,
  GeocodeOptions,
  ReverseGeocodeOptions,
  LatLng,
  LocationType,
  GeocodingStatus,
  AddressComponent,
  Geometry,
  PlusCode,
  GeocodeResult,
  GeocodeResponse,
} from "./types.js";
