import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  GeocodingError, 
  ApiKeyError, 
  InvalidRequestError,
  NetworkError 
} from './errors.js';

describe('Error Classes', () => {
  describe('GeocodingError', () => {
    it('should create error with message and status', () => {
      const error = new GeocodingError('Test error', 'UNKNOWN_ERROR');
      
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.status, 'UNKNOWN_ERROR');
      assert.strictEqual(error.name, 'GeocodingError');
      assert.ok(error instanceof Error);
    });
  });

  describe('ApiKeyError', () => {
    it('should extend GeocodingError', () => {
      const error = new ApiKeyError('Invalid API key', 'REQUEST_DENIED');
      
      assert.strictEqual(error.message, 'Invalid API key');
      assert.strictEqual(error.status, 'REQUEST_DENIED');
      assert.strictEqual(error.name, 'ApiKeyError');
      assert.ok(error instanceof GeocodingError);
      assert.ok(error instanceof Error);
    });

    it('should work with quota errors', () => {
      const error = new ApiKeyError('Quota exceeded', 'OVER_QUERY_LIMIT');
      assert.strictEqual(error.status, 'OVER_QUERY_LIMIT');
    });
  });

  describe('InvalidRequestError', () => {
    it('should have INVALID_REQUEST status', () => {
      const error = new InvalidRequestError('Missing address');
      
      assert.strictEqual(error.message, 'Missing address');
      assert.strictEqual(error.status, 'INVALID_REQUEST');
      assert.strictEqual(error.name, 'InvalidRequestError');
    });
  });

  describe('NetworkError', () => {
    it('should store cause error', () => {
      const cause = new Error('Connection refused');
      const error = new NetworkError('Request failed', cause);
      
      assert.strictEqual(error.message, 'Request failed');
      assert.strictEqual(error.cause, cause);
      assert.strictEqual(error.name, 'NetworkError');
    });

    it('should work without cause', () => {
      const error = new NetworkError('Timeout');
      
      assert.strictEqual(error.message, 'Timeout');
      assert.strictEqual(error.cause, undefined);
    });
  });
});

