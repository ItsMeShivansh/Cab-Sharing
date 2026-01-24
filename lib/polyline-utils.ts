import { decode } from '@googlemaps/polyline-codec';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @returns Distance in meters
 */
export function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);
  const deltaLat = toRad(point2.lat - point1.lat);
  const deltaLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate the cross-track distance (shortest distance from a point to a line segment)
 * This is the CRITICAL function for the polyline matching algorithm
 * @param point - The point to check
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns Distance in meters
 */
export function crossTrackDistance(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): number {
  const R = 6371000; // Earth's radius in meters

  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(lineStart.lat);
  const lng1 = toRad(lineStart.lng);
  const lat2 = toRad(lineEnd.lat);
  const lng2 = toRad(lineEnd.lng);
  const lat3 = toRad(point.lat);
  const lng3 = toRad(point.lng);

  // Calculate bearing from start to end
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  const bearing1 = Math.atan2(y, x);

  // Calculate bearing from start to point
  const y2 = Math.sin(lng3 - lng1) * Math.cos(lat3);
  const x2 =
    Math.cos(lat1) * Math.sin(lat3) -
    Math.sin(lat1) * Math.cos(lat3) * Math.cos(lng3 - lng1);
  const bearing2 = Math.atan2(y2, x2);

  // Calculate angular distance from start to point
  const deltaLat = lat3 - lat1;
  const deltaLng = lng3 - lng1;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat3) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Calculate cross-track distance
  const crossTrack = Math.asin(Math.sin(angularDistance) * Math.sin(bearing2 - bearing1));

  // Calculate along-track distance to find the closest point on the segment
  const alongTrack = Math.acos(Math.cos(angularDistance) / Math.cos(crossTrack));

  // Calculate the length of the segment
  const segmentLength = haversineDistance(lineStart, lineEnd) / R;

  // If the closest point is beyond the segment, return distance to nearest endpoint
  if (alongTrack > segmentLength) {
    return haversineDistance(point, lineEnd);
  } else if (alongTrack < 0) {
    return haversineDistance(point, lineStart);
  }

  // Return the perpendicular distance
  return Math.abs(crossTrack * R);
}

/**
 * Check if a point is within a given threshold distance from a polyline route
 * This is the MAIN ALGORITHM for route matching
 * @param point - The passenger's coordinates
 * @param encodedPolyline - The encoded polyline string from Google Directions API
 * @param thresholdMeters - Maximum distance in meters (default: 500m)
 * @returns Object with isMatch boolean and minDistance
 */
export function isPointOnRoute(
  point: Coordinates,
  encodedPolyline: string,
  thresholdMeters: number = 500
): { isMatch: boolean; minDistance: number; closestPoint?: Coordinates } {
  try {
    // Decode the polyline into an array of [lat, lng] coordinates
    const decodedPath = decode(encodedPolyline, 5);

    let minDistance = Infinity;
    let closestPoint: Coordinates | undefined;

    // Check distance to each segment of the polyline
    for (let i = 0; i < decodedPath.length - 1; i++) {
      const segmentStart: Coordinates = {
        lat: decodedPath[i][0],
        lng: decodedPath[i][1],
      };
      const segmentEnd: Coordinates = {
        lat: decodedPath[i + 1][0],
        lng: decodedPath[i + 1][1],
      };

      const distance = crossTrackDistance(point, segmentStart, segmentEnd);

      if (distance < minDistance) {
        minDistance = distance;
        // Calculate the closest point on this segment
        closestPoint = findClosestPointOnSegment(point, segmentStart, segmentEnd);
      }
    }

    return {
      isMatch: minDistance <= thresholdMeters,
      minDistance,
      closestPoint,
    };
  } catch (error) {
    console.error('Error in isPointOnRoute:', error);
    return { isMatch: false, minDistance: Infinity };
  }
}

/**
 * Find the closest point on a line segment to a given point
 * @param point - The point
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns The closest point on the segment
 */
function findClosestPointOnSegment(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): Coordinates {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  if (dx === 0 && dy === 0) {
    return lineStart;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) /
        (dx * dx + dy * dy)
    )
  );

  return {
    lat: lineStart.lat + t * dy,
    lng: lineStart.lng + t * dx,
  };
}

/**
 * Decode a polyline and return an array of coordinates
 * @param encodedPolyline - The encoded polyline string
 * @returns Array of Coordinates
 */
export function decodePolyline(encodedPolyline: string): Coordinates[] {
  const decoded = decode(encodedPolyline, 5);
  return decoded.map(([lat, lng]) => ({ lat, lng }));
}

/**
 * Calculate the position of a point along a route (as a percentage)
 * Used for estimating when the driver will reach a pickup point
 * @param point - The pickup/dropoff point
 * @param encodedPolyline - The encoded route polyline
 * @returns Position along route (0.0 to 1.0) where 0=start, 1=end
 */
export function getPositionAlongRoute(
  point: Coordinates,
  encodedPolyline: string
): number {
  try {
    const decodedPath = decode(encodedPolyline, 5);
    
    let totalDistance = 0;
    let distanceToPoint = 0;
    let foundClosestSegment = false;
    let minDistance = Infinity;

    // Calculate total route distance and find closest segment
    for (let i = 0; i < decodedPath.length - 1; i++) {
      const segmentStart: Coordinates = {
        lat: decodedPath[i][0],
        lng: decodedPath[i][1],
      };
      const segmentEnd: Coordinates = {
        lat: decodedPath[i + 1][0],
        lng: decodedPath[i + 1][1],
      };

      const segmentLength = haversineDistance(segmentStart, segmentEnd);
      const distanceToSegment = crossTrackDistance(point, segmentStart, segmentEnd);

      // Find the closest segment to the point
      if (distanceToSegment < minDistance) {
        minDistance = distanceToSegment;
        distanceToPoint = totalDistance;
        
        // Calculate how far along this segment the closest point is
        const closestPoint = findClosestPointOnSegment(point, segmentStart, segmentEnd);
        distanceToPoint += haversineDistance(segmentStart, closestPoint);
        foundClosestSegment = true;
      }

      totalDistance += segmentLength;
    }

    if (totalDistance === 0 || !foundClosestSegment) {
      return 0;
    }

    // Return position as percentage (0.0 to 1.0)
    return Math.min(1.0, Math.max(0.0, distanceToPoint / totalDistance));
  } catch (error) {
    console.error('Error in getPositionAlongRoute:', error);
    return 0;
  }
}

/**
 * Calculate estimated time to reach a point along the route
 * @param point - The pickup/dropoff point
 * @param encodedPolyline - The encoded route polyline
 * @param totalDurationSeconds - Total route duration in seconds
 * @returns Estimated time to reach point in seconds
 */
export function estimateTimeToPoint(
  point: Coordinates,
  encodedPolyline: string,
  totalDurationSeconds: number
): number {
  const position = getPositionAlongRoute(point, encodedPolyline);
  return Math.round(position * totalDurationSeconds);
}
