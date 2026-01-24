import { Coordinates } from './polyline-utils';

/**
 * Validate if coordinates are within valid ranges
 */
function isValidCoordinate(coord: Coordinates): boolean {
  return (
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180 &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng)
  );
}

export interface GoogleDirectionsResponse {
  routes: Array<{
    overview_polyline: {
      points: string;
    };
    legs: Array<{
      duration: {
        text: string;
        value: number;
      };
      distance: {
        text: string;
        value: number;
      };
      start_address: string;
      end_address: string;
    }>;
  }>;
  status: string;
}

export interface PlaceAutocompleteResponse {
  predictions: Array<{
    description: string;
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }>;
  status: string;
}

export interface PlaceDetailsResponse {
  result: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  };
  status: string;
}

/**
 * Get directions between two points using Google Directions API
 */
export async function getDirections(
  origin: Coordinates,
  destination: Coordinates
): Promise<GoogleDirectionsResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not defined');
  }

  // Validate coordinates
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    throw new Error('Invalid coordinates provided. Latitude must be between -90 and 90, longitude between -180 and 180.');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.append('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.append('key', apiKey);
  url.searchParams.append('mode', 'driving');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Directions API error: ${response.statusText}`);
  }

  const data: GoogleDirectionsResponse = await response.json();

  if (data.status !== 'OK') {
    // Provide more helpful error messages based on status
    const errorMessages: { [key: string]: string } = {
      'NOT_FOUND': 'Could not find a route between the specified locations. Please check that the coordinates are valid and represent accessible locations.',
      'ZERO_RESULTS': 'No route could be found between these locations.',
      'MAX_WAYPOINTS_EXCEEDED': 'Too many waypoints in the request.',
      'INVALID_REQUEST': 'Invalid request. Please check the coordinates format.',
      'OVER_QUERY_LIMIT': 'API quota exceeded. Please try again later.',
      'REQUEST_DENIED': 'API request was denied. Please check your API key has the Directions API enabled and billing is set up.',
      'UNKNOWN_ERROR': 'Unknown error. Please try again.',
    };
    
    const errorMessage = errorMessages[data.status] || `Google Directions API returned status: ${data.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Geocode an address to get coordinates using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not defined');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.append('address', address);
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.results[0]) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  return {
    lat: data.results[0].geometry.location.lat,
    lng: data.results[0].geometry.location.lng,
  };
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not defined');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.append('place_id', placeId);
  url.searchParams.append('fields', 'geometry,formatted_address');
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.statusText}`);
  }

  const data: PlaceDetailsResponse = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Places API returned status: ${data.status}`);
  }

  return data;
}
