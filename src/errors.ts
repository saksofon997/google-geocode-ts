import type { GeocodingStatus } from "./types.js";

/**
 * Base error class for geocoding errors
 */
export class GeocodingError extends Error {
  readonly status: GeocodingStatus;

  constructor(message: string, status: GeocodingStatus) {
    super(message);
    this.name = "GeocodingError";
    this.status = status;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeocodingError);
    }
  }
}

/**
 * Error thrown when the API key is invalid or quota exceeded
 */
export class ApiKeyError extends GeocodingError {
  constructor(message: string, status: GeocodingStatus) {
    super(message, status);
    this.name = "ApiKeyError";
  }
}

/**
 * Error thrown when the request is invalid
 */
export class InvalidRequestError extends GeocodingError {
  constructor(message: string) {
    super(message, "INVALID_REQUEST");
    this.name = "InvalidRequestError";
  }
}

/**
 * Error thrown on network/timeout issues
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "NetworkError";
  }
}
