/**
 * Configuration options for the Geocoder client
 */
export interface GeocoderConfig {
  /** Your Google Maps API key */
  apiKey: string;
  /** Optional base URL override (useful for testing) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Default language for results */
  language?: string;
  /** Default region bias */
  region?: string;
}

/**
 * Options for geocoding an address
 */
export interface GeocodeOptions {
  /** The address to geocode. Optional if `components` is provided. */
  address?: string;
  /** Component filters (country, postal_code, etc.). Optional if `address` is provided. */
  components?: Record<string, string>;
  /** Bounds to bias the results */
  bounds?: {
    northeast: LatLng;
    southwest: LatLng;
  };
  /** Language for results (overrides default) */
  language?: string;
  /** Region bias (overrides default) */
  region?: string;
}

/**
 * Options for reverse geocoding coordinates
 */
export interface ReverseGeocodeOptions {
  /** Latitude and longitude to reverse geocode */
  latlng: LatLng;
  /** Filter results by type */
  resultType?: ResultType[];
  /** Filter results by location type */
  locationType?: LocationType[];
  /** Language for results (overrides default) */
  language?: string;
}

/**
 * Latitude and longitude coordinates
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Location types returned by the API
 */
export type LocationType = 
  | 'ROOFTOP'
  | 'RANGE_INTERPOLATED'
  | 'GEOMETRIC_CENTER'
  | 'APPROXIMATE';

/**
 * Result types used for filtering reverse geocoding responses.
 * (Based on the documented `result_type` options.)
 */
export type ResultType =
  | 'street_address'
  | 'route'
  | 'intersection'
  | 'political'
  | 'country'
  | 'administrative_area_level_1'
  | 'administrative_area_level_2'
  | 'colloquial_area'
  | 'locality'
  | 'sublocality'
  | 'neighborhood'
  | 'premise'
  | 'subpremise'
  | 'postal_code'
  | 'natural_feature'
  | 'airport'
  | 'park'
  | 'point_of_interest';

/**
 * Status codes returned by the Geocoding API
 */
export type GeocodingStatus =
  | 'OK'
  | 'ZERO_RESULTS'
  | 'OVER_DAILY_LIMIT'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

/**
 * Address component returned by the API
 */
export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

/**
 * Geometry information for a geocode result
 */
export interface Geometry {
  location: LatLng;
  locationType: LocationType;
  viewport: {
    northeast: LatLng;
    southwest: LatLng;
  };
  bounds?: {
    northeast: LatLng;
    southwest: LatLng;
  };
}

/**
 * Plus code information
 */
export interface PlusCode {
  globalCode: string;
  compoundCode?: string;
}

/**
 * A single geocoding result
 */
export interface GeocodeResult {
  addressComponents: AddressComponent[];
  formattedAddress: string;
  geometry: Geometry;
  placeId: string;
  plusCode?: PlusCode;
  /** Present for some postal code results */
  postcodeLocalities?: string[];
  types: string[];
  partialMatch?: boolean;
}

/**
 * Response from the Geocoding API
 */
export interface GeocodeResponse {
  status: GeocodingStatus;
  results: GeocodeResult[];
  /** Can be present for some responses */
  plusCode?: PlusCode;
  errorMessage?: string;
}

/**
 * Raw Google Geocoding API response types (snake_case).
 * These reflect the wire format returned by Google.
 */
export interface RawAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface RawGeometry {
  location: LatLng;
  location_type: LocationType;
  viewport: {
    northeast: LatLng;
    southwest: LatLng;
  };
  bounds?: {
    northeast: LatLng;
    southwest: LatLng;
  };
}

export interface RawPlusCode {
  global_code: string;
  compound_code?: string;
}

export interface RawGeocodeResult {
  address_components: RawAddressComponent[];
  formatted_address: string;
  geometry: RawGeometry;
  place_id: string;
  plus_code?: RawPlusCode;
  postcode_localities?: string[];
  types: string[];
  partial_match?: boolean;
}

export interface RawGeocodeResponse {
  status: GeocodingStatus;
  results: RawGeocodeResult[];
  plus_code?: RawPlusCode;
  error_message?: string;
}

