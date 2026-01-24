'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RideCard } from '@/components/RideCard';
import { MapPin, Search, Loader2, AlertCircle, Car } from 'lucide-react';
import { isPointOnRoute } from '@/lib/polyline-utils';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trustScore: number;
}

interface Ride {
  id: string;
  driverId: string;
  originAddress: string;
  destAddress: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  departureTime: string;
  maxPassengers: number;
  ghostMode: boolean;
  status: string;
  routePolyline: string;
  routeDuration: number;
  routeDistance: number;
  driver: Driver;
  availableSeats?: number; // Calculated field
}

interface BrowseRidesProps {
  userId: string;
}

export function BrowseRides({ userId }: BrowseRidesProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [filteredRides, setFilteredRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterLat, setFilterLat] = useState('');
  const [filterLng, setFilterLng] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Fetch all rides on component mount
  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/rides/list?limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to fetch rides');
      }

      const data = await response.json();
      setRides(data.rides);
      setFilteredRides(data.rides);
    } catch (err) {
      setError('Unable to load rides. Please try again later.');
      console.error('Error fetching rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeLocation = async () => {
    if (!filterLocation.trim()) {
      setError('Please enter a location name');
      return;
    }

    try {
      setGeocoding(true);
      setError('');

      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(filterLocation)}`
      );

      if (!response.ok) {
        throw new Error('Failed to geocode location');
      }

      const data = await response.json();
      setFilterLat(data.lat.toString());
      setFilterLng(data.lng.toString());
    } catch (err) {
      setError('Could not find the location. Please try a different name or enter coordinates manually.');
      console.error('Geocoding error:', err);
    } finally {
      setGeocoding(false);
    }
  };

  const handleFilterRides = () => {
    if (!filterLat || !filterLng) {
      setError('Please enter a location or coordinates');
      return;
    }

    const lat = parseFloat(filterLat);
    const lng = parseFloat(filterLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates');
      return;
    }

    setIsFiltering(true);
    setError('');

    try {
      console.log('Filtering rides...', { lat, lng, totalRides: rides.length });
      
      // Filter rides that pass near the specified location
      const matchingRides = rides.filter((ride) => {
        const point = { lat, lng };
        const result = isPointOnRoute(point, ride.routePolyline, 500); // 500m threshold
        console.log(`Ride ${ride.id}:`, {
          isMatch: result.isMatch,
          distance: `${result.minDistance.toFixed(0)}m`,
          origin: ride.originAddress,
          dest: ride.destAddress
        });
        return result.isMatch;
      });

      console.log('Matching rides found:', matchingRides.length);
      setFilteredRides(matchingRides);
      
      if (rides.length === 0) {
        setError('No rides available in the system yet. Create a ride first using the "Offer a Ride" tab.');
      } else if (matchingRides.length === 0) {
        setError(`No rides found passing through this location (${filterLocation}). Try a different location or clear the filter to see all ${rides.length} available rides.`);
      }
    } catch (err) {
      setError('Error filtering rides');
      console.error('Filter error:', err);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleClearFilter = () => {
    setFilteredRides(rides);
    setFilterLocation('');
    setFilterLat('');
    setFilterLng('');
    setIsFiltering(false);
    setError('');
  };

  const handleBookRide = async (rideId: string) => {
    if (!filterLat || !filterLng) {
      alert('Please set your pickup location first');
      return;
    }

    try {
      const response = await fetch('/api/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          passengerId: userId,
          pickupLat: parseFloat(filterLat),
          pickupLng: parseFloat(filterLng),
          dropoffLat: parseFloat(filterLat), // For now, using same location
          dropoffLng: parseFloat(filterLng), // You can enhance this later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to book ride');
      }

      alert('Ride request sent successfully! The driver will review your request.');
      fetchRides(); // Refresh the list
    } catch (err) {
      alert('Failed to book ride. Please try again.');
      console.error('Booking error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading rides...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Rides by Your Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filterLocation">Location Name</Label>
              <div className="flex gap-2">
                <Input
                  id="filterLocation"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="e.g., IIIT Hyderabad"
                  onKeyDown={(e) => e.key === 'Enter' && handleGeocodeLocation()}
                />
                <Button
                  type="button"
                  onClick={handleGeocodeLocation}
                  disabled={geocoding || !filterLocation.trim()}
                  variant="outline"
                >
                  {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Or Enter Coordinates</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  value={filterLat}
                  onChange={(e) => setFilterLat(e.target.value)}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="any"
                  value={filterLng}
                  onChange={(e) => setFilterLng(e.target.value)}
                  placeholder="Longitude"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleFilterRides}
              disabled={isFiltering || (!filterLat || !filterLng)}
              className="flex-1"
            >
              {isFiltering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Filtering...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Show Rides Through This Location
                </>
              )}
            </Button>
            {isFiltering && (
              <Button onClick={handleClearFilter} variant="outline">
                Clear Filter
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rides List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isFiltering 
              ? `Matching Rides (${filteredRides.length})` 
              : `All Available Rides (${filteredRides.length})`
            }
          </h2>
          {isFiltering && (
            <Button onClick={handleClearFilter} variant="ghost" size="sm">
              Show All Rides
            </Button>
          )}
        </div>

        {filteredRides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No rides available</h3>
              <p className="mt-2 text-sm text-gray-600">
                {isFiltering 
                  ? 'Try a different location or clear the filter to see all rides.' 
                  : 'Check back later or create your own ride.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRides.map((ride) => {
              // Convert to RideCard compatible format
              const rideCardData = {
                ...ride,
                driver: {
                  ...ride.driver,
                  phone: ride.driver.phone ?? undefined,
                },
              };
              
              return (
                <div key={ride.id} className="relative">
                  <RideCard ride={rideCardData} showDriverInfo />
                  {filterLat && filterLng && (
                    <Button
                      onClick={() => handleBookRide(ride.id)}
                      className="mt-2 w-full"
                      disabled={(ride.availableSeats ?? 0) <= 0}
                    >
                      {(ride.availableSeats ?? 0) > 0 ? 'Request to Book' : 'Fully Booked'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
