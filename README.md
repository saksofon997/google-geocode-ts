[![npm](https://img.shields.io/npm/v/%40saksofon997%2Fgeocode?logo=npm)](https://www.npmjs.com/package/@saksofon997/geocode)
[![GitHub Actions](https://github.com/saksofon997/google-geocode-ts/actions/workflows/publish.yml/badge.svg)](https://github.com/saksofon997/google-geocode-ts/actions/workflows/publish.yml)

# @saksofon997/geocode

A modern, TypeScript-first ESM wrapper for the Google Geocoding API with built-in caching and rate limiting.

## Features

- 🚀 **Modern ESM** - Built for ESNext with full ESM support
- 📦 **Zero dependencies** - Uses native `fetch` API
- 🔒 **Type-safe** - Full TypeScript support with detailed types
- ⚡ **Lightweight** - Minimal footprint
- 🛡️ **Error handling** - Descriptive error classes for different failure modes
- 💾 **Built-in caching** - LRU cache with TTL to reduce API calls
- 🚦 **Rate limiting** - Token bucket rate limiter with request queuing

## Installation

```bash
npm install @saksofon997/geocode
```

## Quick Start

```typescript
import { Geocoder } from '@saksofon997/geocode';

const geocoder = new Geocoder({
  apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
});

// Geocode an address
const results = await geocoder.geocode({
  address: '1600 Amphitheatre Parkway, Mountain View, CA',
});

console.log(results[0].geometry.location);
// { lat: 37.4224764, lng: -122.0842499 }
```

## Usage

### Basic Geocoding

```typescript
const results = await geocoder.geocode({
  address: '1600 Amphitheatre Parkway, Mountain View, CA',
});

console.log(results[0].formattedAddress);
// "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
```

### Reverse Geocoding

```typescript
const results = await geocoder.reverseGeocode({
  latlng: { lat: 37.4224764, lng: -122.0842499 },
});

console.log(results[0].formattedAddress);
// "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
```

### Convenience Methods

```typescript
// Get just the coordinates
const coords = await geocoder.getCoordinates('1600 Amphitheatre Parkway');
// { lat: 37.4224764, lng: -122.0842499 }

// Get just the formatted address
const address = await geocoder.getAddress({ lat: 37.4224764, lng: -122.0842499 });
// "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
```

### Configuration Options

```typescript
const geocoder = new Geocoder({
  // Required
  apiKey: 'YOUR_API_KEY',
  
  // Optional - default settings
  language: 'en',              // Default language for results
  region: 'us',                // Default region bias
  timeout: 10000,              // Request timeout in ms
  
  // Caching (enabled by default)
  cache: {
    ttl: 3600000,              // Cache TTL in ms (default: 1 hour)
    maxSize: 1000,             // Max cache entries (default: 1000)
  },
  
  // Rate limiting (enabled by default)
  rateLimiter: {
    maxRequests: 50,           // Requests per interval (default: 50)
    interval: 1000,            // Interval in ms (default: 1 second)
    queue: true,               // Queue requests when rate limited (default: true)
    maxQueueSize: 100,         // Max queue size (default: 100)
  },
});
```

### Disabling Features

```typescript
// Disable caching and/or rate limiting
const geocoder = new Geocoder({
  apiKey: 'YOUR_API_KEY',
  cache: false,           // Disable caching
  rateLimiter: false,     // Disable rate limiting
});
```

### Advanced Geocoding

```typescript
// With component filtering
const results = await geocoder.geocode({
  address: 'Paris',
  components: { country: 'FR' },
});

// With viewport biasing
const results = await geocoder.geocode({
  address: 'Main Street',
  bounds: {
    northeast: { lat: 40.0, lng: -74.0 },
    southwest: { lat: 39.0, lng: -75.0 },
  },
});

// With language override
const results = await geocoder.geocode({
  address: 'Tokyo',
  language: 'ja',
});
```

### Error Handling

```typescript
import { 
  Geocoder, 
  ApiKeyError,
  InvalidRequestError,
  NetworkError,
  RateLimitError
} from '@saksofon997/geocode';

try {
  const results = await geocoder.geocode({ address: 'Invalid Address XYZ123' });
  if (results.length === 0) {
    console.log('No results found');
  }
} catch (error) {
  if (error instanceof ApiKeyError) {
    console.log('API key issue:', error.message, error.status);
  } else if (error instanceof InvalidRequestError) {
    console.log('Invalid request:', error.message);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded (queue disabled or full)');
  }
}
```

### Cache Management

```typescript
// Get cache statistics
const stats = geocoder.getCacheStats();
console.log(stats); // { size: 42, enabled: true }

// Clear the cache
geocoder.clearCache();
```

### Rate Limiter Statistics

```typescript
// Get rate limiter statistics
const stats = geocoder.getRateLimiterStats();
console.log(stats); 
// { availableTokens: 45, queueSize: 0, enabled: true }
```

### Using Cache and Rate Limiter Directly

You can also use the cache and rate limiter independently:

```typescript
import { Cache, RateLimiter } from '@saksofon997/geocode';

// Standalone cache
const cache = new Cache<string>({ ttl: 60000, maxSize: 100 });
cache.set('key', 'value');
const value = cache.get('key');

// Standalone rate limiter
const limiter = new RateLimiter({ maxRequests: 10, interval: 1000 });
await limiter.acquire(); // Waits if rate limited
const acquired = limiter.tryAcquire(); // Returns false if rate limited
```

### Cleanup

When you're done with the geocoder, dispose of it to clean up timers:

```typescript
geocoder.dispose();
```

## API Reference

### `Geocoder`

#### Constructor

```typescript
new Geocoder(config: GeocoderConfigWithFeatures)
```

#### Methods

| Method | Description |
|--------|-------------|
| `geocode(options: GeocodeOptions)` | Geocode an address to coordinates |
| `reverseGeocode(options: ReverseGeocodeOptions)` | Reverse geocode coordinates to address |
| `getCoordinates(address: string)` | Get coordinates for an address (convenience) |
| `getAddress(latlng: LatLng)` | Get address for coordinates (convenience) |
| `clearCache()` | Clear the geocoding cache |
| `getCacheStats()` | Get cache statistics |
| `getRateLimiterStats()` | Get rate limiter statistics |
| `dispose()` | Clean up resources |

### Error Classes

| Error | Description |
|-------|-------------|
| `GeocodingError` | Base error class |
| `ApiKeyError` | Invalid API key or quota exceeded |
| `InvalidRequestError` | Invalid request parameters |
| `NetworkError` | Network or timeout error |
| `RateLimitError` | Rate limit exceeded (queue disabled/full) |

### Types

See the [TypeScript definitions](./src/types.ts) for complete type information.

## Requirements

- Node.js 18+ (uses native `fetch`)
- Google Maps API key with Geocoding API enabled

## Testing

```bash
npm test
```

## License

MIT
