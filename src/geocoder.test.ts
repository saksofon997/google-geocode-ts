import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { Geocoder } from './geocoder.js';
import { 
  InvalidRequestError, 
  ApiKeyError, 
  NetworkError 
} from './errors.js';
import type { RawGeocodeResponse } from './types.js';

// Mock response data
const mockGeocodeResponse: RawGeocodeResponse = {
  status: 'OK',
  results: [{
    address_components: [
      { long_name: '1600', short_name: '1600', types: ['street_number'] },
      { long_name: 'Amphitheatre Parkway', short_name: 'Amphitheatre Pkwy', types: ['route'] },
    ],
    formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
    geometry: {
      location: { lat: 37.4224764, lng: -122.0842499 },
      location_type: 'ROOFTOP',
      viewport: {
        northeast: { lat: 37.4238, lng: -122.0829 },
        southwest: { lat: 37.4211, lng: -122.0856 },
      },
    },
    place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
    types: ['street_address'],
  }],
};

describe('Geocoder', () => {
  let geocoder: Geocoder;
  let originalFetch: typeof global.fetch;
  let mockFetch: ReturnType<typeof mock.fn<typeof global.fetch>>;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = mock.fn<typeof global.fetch>();
    global.fetch = mockFetch;
    
    geocoder = new Geocoder({ 
      apiKey: 'test-api-key',
      cache: false,      // Disable cache for most tests
      rateLimiter: false // Disable rate limiter for most tests
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    geocoder.dispose();
  });

  describe('constructor', () => {
    it('should throw if API key is missing', () => {
      assert.throws(
        () => new Geocoder({ apiKey: '' }),
        InvalidRequestError
      );
    });

    it('should accept valid configuration', () => {
      const g = new Geocoder({ 
        apiKey: 'test',
        language: 'en',
        region: 'us',
        timeout: 5000
      });
      assert.ok(g);
      g.dispose();
    });
  });

  describe('geocode', () => {
    it('should geocode an address', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      const results = await geocoder.geocode({ address: '1600 Amphitheatre Parkway' });
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].formattedAddress, '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA');
      assert.strictEqual(results[0].geometry.location.lat, 37.4224764);
      assert.strictEqual(results[0].geometry.locationType, 'ROOFTOP');
      assert.strictEqual(results[0].placeId, 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA');
    });

    it('should throw InvalidRequestError for empty address', async () => {
      await assert.rejects(
        () => geocoder.geocode({ address: '' }),
        InvalidRequestError
      );
      
      await assert.rejects(
        () => geocoder.geocode({ address: '   ' }),
        InvalidRequestError
      );
    });

    it('should return empty array when no results', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify({ 
          status: 'ZERO_RESULTS', 
          results: [] 
        })))
      );

      const results = await geocoder.geocode({ address: 'nonexistent address xyz123' });
      
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });

    it('should throw ApiKeyError for quota exceeded', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify({ 
          status: 'OVER_QUERY_LIMIT', 
          results: [],
          error_message: 'You have exceeded your quota'
        })))
      );

      await assert.rejects(
        () => geocoder.geocode({ address: 'test' }),
        ApiKeyError
      );
    });

    it('should include language and region in request', async () => {
      const localizedGeocoder = new Geocoder({ 
        apiKey: 'test',
        language: 'ja',
        region: 'jp',
        cache: false,
        rateLimiter: false
      });

      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      await localizedGeocoder.geocode({ address: 'Tokyo' });
      
      const callArgs = mockFetch.mock.calls[0].arguments[0] as string;
      assert.ok(callArgs.includes('language=ja'));
      assert.ok(callArgs.includes('region=jp'));
      
      localizedGeocoder.dispose();
    });

    it('should include components in request', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      await geocoder.geocode({ 
        address: 'Paris',
        components: { country: 'FR' }
      });
      
      const callArgs = mockFetch.mock.calls[0].arguments[0] as string;
      assert.ok(callArgs.includes('components=country%3AFR'));
    });

    it('should allow components-only geocoding (no address)', async () => {
      mockFetch.mock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      await geocoder.geocode({
        components: { country: 'US', postal_code: '94043', locality: 'Mountain View' },
      });

      const callArgs = mockFetch.mock.calls[0].arguments[0] as string;
      assert.ok(callArgs.includes('components='));
      assert.ok(!callArgs.includes('address='));
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      const results = await geocoder.reverseGeocode({ 
        latlng: { lat: 37.4224764, lng: -122.0842499 } 
      });
      
      assert.strictEqual(results.length, 1);
    });

    it('should throw InvalidRequestError for invalid coordinates', async () => {
      await assert.rejects(
        () => geocoder.reverseGeocode({ latlng: { lat: 91, lng: 0 } }),
        InvalidRequestError
      );

      await assert.rejects(
        () => geocoder.reverseGeocode({ latlng: { lat: 0, lng: 181 } }),
        InvalidRequestError
      );
    });

    it('should return empty array when no results', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify({ 
          status: 'ZERO_RESULTS', 
          results: [] 
        })))
      );

      const results = await geocoder.reverseGeocode({ 
        latlng: { lat: 0, lng: 0 } 
      });
      
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });
  });

  describe('getCoordinates', () => {
    it('should return coordinates for an address', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      const coords = await geocoder.getCoordinates('1600 Amphitheatre Parkway');
      
      assert.ok(coords !== null);
      assert.strictEqual(coords.lat, 37.4224764);
      assert.strictEqual(coords.lng, -122.0842499);
    });

    it('should return null when no results', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify({ 
          status: 'ZERO_RESULTS', 
          results: [] 
        })))
      );

      const coords = await geocoder.getCoordinates('nonexistent address xyz123');
      
      assert.strictEqual(coords, null);
    });
  });

  describe('getAddress', () => {
    it('should return address for coordinates', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      const address = await geocoder.getAddress({ lat: 37.4224764, lng: -122.0842499 });
      
      assert.strictEqual(address, '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA');
    });

    it('should return null when no results', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify({ 
          status: 'ZERO_RESULTS', 
          results: [] 
        })))
      );

      const address = await geocoder.getAddress({ lat: 0, lng: 0 });
      
      assert.strictEqual(address, null);
    });
  });

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const cachedGeocoder = new Geocoder({ 
        apiKey: 'test',
        cache: { ttl: 10000 },
        rateLimiter: false
      });

      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      // First call - should hit API
      await cachedGeocoder.geocode({ address: 'test address' });
      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      // Second call - should use cache
      await cachedGeocoder.geocode({ address: 'test address' });
      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      // Different address - should hit API
      await cachedGeocoder.geocode({ address: 'different address' });
      assert.strictEqual(mockFetch.mock.callCount(), 2);
      
      cachedGeocoder.dispose();
    });

    it('should report cache stats', () => {
      const cachedGeocoder = new Geocoder({ 
        apiKey: 'test',
        cache: { ttl: 10000 }
      });

      const stats = cachedGeocoder.getCacheStats();
      assert.strictEqual(stats.enabled, true);
      assert.strictEqual(stats.size, 0);
      
      cachedGeocoder.dispose();
    });

    it('should clear cache', async () => {
      const cachedGeocoder = new Geocoder({ 
        apiKey: 'test',
        cache: { ttl: 10000 },
        rateLimiter: false
      });

      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      await cachedGeocoder.geocode({ address: 'test' });
      assert.strictEqual(cachedGeocoder.getCacheStats().size, 1);
      
      cachedGeocoder.clearCache();
      assert.strictEqual(cachedGeocoder.getCacheStats().size, 0);
      
      cachedGeocoder.dispose();
    });
  });

  describe('rate limiting', () => {
    it('should report rate limiter stats', () => {
      const limitedGeocoder = new Geocoder({ 
        apiKey: 'test',
        rateLimiter: { maxRequests: 10 }
      });

      const stats = limitedGeocoder.getRateLimiterStats();
      assert.strictEqual(stats.enabled, true);
      assert.strictEqual(stats.availableTokens, 10);
      
      limitedGeocoder.dispose();
    });

    it('should consume tokens on requests', async () => {
      const limitedGeocoder = new Geocoder({ 
        apiKey: 'test',
        cache: false,
        rateLimiter: { maxRequests: 5, interval: 1000, queue: false }
      });

      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify(mockGeocodeResponse)))
      );

      await limitedGeocoder.geocode({ address: 'test1' });
      await limitedGeocoder.geocode({ address: 'test2' });
      
      const stats = limitedGeocoder.getRateLimiterStats();
      assert.strictEqual(stats.availableTokens, 3);
      
      limitedGeocoder.dispose();
    });
  });

  describe('network errors', () => {
    it('should throw NetworkError on HTTP error', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(new Response('Not Found', { status: 404 }))
      );

      await assert.rejects(
        () => geocoder.geocode({ address: 'test' }),
        NetworkError
      );
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mock.mockImplementation(() => 
        Promise.reject(new Error('Network failure'))
      );

      await assert.rejects(
        () => geocoder.geocode({ address: 'test' }),
        NetworkError
      );
    });
  });
});
