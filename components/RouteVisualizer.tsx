'use client';

import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { decodePolyline, Coordinates } from '@/lib/polyline-utils';

interface RouteVisualizerProps {
  origin: Coordinates;
  destination: Coordinates;
  encodedPolyline?: string;
  pickupPoint?: Coordinates;
  dropoffPoint?: Coordinates;
  pickupClosestPoint?: Coordinates;
  dropoffClosestPoint?: Coordinates;
}

function RouteLayer({ 
  encodedPolyline, 
  pickupPoint, 
  dropoffPoint,
  pickupClosestPoint,
  dropoffClosestPoint 
}: Omit<RouteVisualizerProps, 'origin' | 'destination'>) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const pickupLineRef = useRef<google.maps.Polyline | null>(null);
  const dropoffLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !encodedPolyline) return;

    // Draw main route
    const path = decodePolyline(encodedPolyline);
    
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      path: path.map(p => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: map,
    });

    // Draw pickup connection line
    if (pickupPoint && pickupClosestPoint) {
      if (pickupLineRef.current) {
        pickupLineRef.current.setMap(null);
      }

      pickupLineRef.current = new google.maps.Polyline({
        path: [
          { lat: pickupPoint.lat, lng: pickupPoint.lng },
          { lat: pickupClosestPoint.lat, lng: pickupClosestPoint.lng },
        ],
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        map: map,
        icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 3
          },
          offset: '0',
          repeat: '20px'
        }],
      });
    }

    // Draw dropoff connection line
    if (dropoffPoint && dropoffClosestPoint) {
      if (dropoffLineRef.current) {
        dropoffLineRef.current.setMap(null);
      }

      dropoffLineRef.current = new google.maps.Polyline({
        path: [
          { lat: dropoffPoint.lat, lng: dropoffPoint.lng },
          { lat: dropoffClosestPoint.lat, lng: dropoffClosestPoint.lng },
        ],
        geodesic: true,
        strokeColor: '#ef4444',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        map: map,
        icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 3
          },
          offset: '0',
          repeat: '20px'
        }],
      });
    }

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (pickupLineRef.current) pickupLineRef.current.setMap(null);
      if (dropoffLineRef.current) dropoffLineRef.current.setMap(null);
    };
  }, [map, encodedPolyline, pickupPoint, dropoffPoint, pickupClosestPoint, dropoffClosestPoint]);

  return null;
}

export function RouteVisualizer(props: RouteVisualizerProps) {
  const { origin, destination, pickupPoint, dropoffPoint, encodedPolyline, pickupClosestPoint, dropoffClosestPoint } = props;
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-red-600">Google Maps API key is not configured</p>
      </div>
    );
  }

  // Calculate center and zoom
  const bounds = new google.maps.LatLngBounds();
  bounds.extend({ lat: origin.lat, lng: origin.lng });
  bounds.extend({ lat: destination.lat, lng: destination.lng });
  if (pickupPoint) bounds.extend({ lat: pickupPoint.lat, lng: pickupPoint.lng });
  if (dropoffPoint) bounds.extend({ lat: dropoffPoint.lat, lng: dropoffPoint.lng });

  const center = bounds.getCenter();
  const mapCenter = { lat: center.lat(), lng: center.lng() };

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200">
        <Map
          defaultCenter={mapCenter}
          defaultZoom={12}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          mapId="campuspool-map"
        >
          {/* Origin marker */}
          <Marker
            position={origin}
            title="Origin"
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            }}
          />

          {/* Destination marker */}
          <Marker
            position={destination}
            title="Destination"
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            }}
          />

          {/* Pickup point marker */}
          {pickupPoint && (
            <Marker
              position={pickupPoint}
              title="Pickup Point"
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }}
            />
          )}

          {/* Dropoff point marker */}
          {dropoffPoint && (
            <Marker
              position={dropoffPoint}
              title="Dropoff Point"
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
              }}
            />
          )}

          {/* Route polyline */}
          {encodedPolyline && (
            <RouteLayer
              encodedPolyline={encodedPolyline}
              pickupPoint={pickupPoint}
              dropoffPoint={dropoffPoint}
              pickupClosestPoint={pickupClosestPoint}
              dropoffClosestPoint={dropoffClosestPoint}
            />
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
