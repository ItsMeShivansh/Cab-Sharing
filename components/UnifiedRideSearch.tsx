'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RideCard } from '@/components/RideCard';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Search, Loader2, AlertCircle, Navigation, Clock, SlidersHorizontal, X } from 'lucide-react';
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
  availableSeats?: number;
  matchDetails?: {
    pickupDistance: number;
    dropoffDistance: number;
    availableSeats: number;
    estimatedPickupTime?: string;
    timeToPickupMinutes?: number;
  };
}

interface UnifiedRideSearchProps {
  userId: string;
}

type SearchMode = 'browse' | 'search';

export function UnifiedRideSearch({ userId }: UnifiedRideSearchProps) {
  const { toast } = useToast();
  
  // All rides from database
  const [allRides, setAllRides] = useState<Ride[]>([]);
  const [displayedRides, setDisplayedRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Search mode
  const [searchMode, setSearchMode] = useState<SearchMode>('browse');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter by single location (for browsing)
  const [filterLocation, setFilterLocation] = useState('');
  const [filterLat, setFilterLat] = useState('');
  const [filterLng, setFilterLng] = useState('');
  const [geocodingFilter, setGeocodingFilter] = useState(false);
  
  // Full search (pickup + dropoff)
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [thresholdMeters, setThresholdMeters] = useState(500);
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDropoff, setGeocodingDropoff] = useState(false);
  
  // Fetch all rides on mount
  useEffect(() => {
    fetchAllRides();
  }, []);

  const fetchAllRides = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/rides/list?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch rides');
      }

      const data = await response.json();
      setAllRides(data.rides);
      setDisplayedRides(data.rides);
    } catch (err) {
      setError('Unable to load rides. Please try again later.');
      console.error('Error fetching rides:', err);
    } finally {
      setLoading(false);
    }
  };

  // Geocode helper function
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error('Geocoding failed');
      const data = await response.json();
      return { lat: data.lat, lng: data.lng };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  // Handle geocoding for filter location
  const handleGeocodeFilter = async () => {
    if (!filterLocation.trim()) return;
    
    setGeocodingFilter(true);
    const coords = await geocodeAddress(filterLocation);
    if (coords) {
      setFilterLat(coords.lat.toString());
      setFilterLng(coords.lng.toString());
      toast({ title: 'Location found!', description: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
    } else {
      toast({ title: 'Error', description: 'Could not find location', variant: 'destructive' });
    }
    setGeocodingFilter(false);
  };

  // Handle geocoding for pickup
  const handleGeocodePickup = async () => {
    if (!pickupAddress.trim()) return;
    
    setGeocodingPickup(true);
    const coords = await geocodeAddress(pickupAddress);
    if (coords) {
      setPickupLat(coords.lat.toString());
      setPickupLng(coords.lng.toString());
      toast({ title: 'Pickup location found!' });
    } else {
      toast({ title: 'Error', description: 'Could not find location', variant: 'destructive' });
    }
    setGeocodingPickup(false);
  };

  // Handle geocoding for dropoff
  const handleGeocodeDropoff = async () => {
    if (!dropoffAddress.trim()) return;
    
    setGeocodingDropoff(true);
    const coords = await geocodeAddress(dropoffAddress);
    if (coords) {
      setDropoffLat(coords.lat.toString());
      setDropoffLng(coords.lng.toString());
      toast({ title: 'Dropoff location found!' });
    } else {
      toast({ title: 'Error', description: 'Could not find location', variant: 'destructive' });
    }
    setGeocodingDropoff(false);
  };

  // Filter rides by single location (browse mode)
  const handleFilterByLocation = () => {
    if (!filterLat || !filterLng) {
      setError('Please find a location first');
      return;
    }

    const lat = parseFloat(filterLat);
    const lng = parseFloat(filterLng);

    const matchingRides = allRides.filter((ride) => {
      const result = isPointOnRoute({ lat, lng }, ride.routePolyline, thresholdMeters);
      return result.isMatch;
    });

    setDisplayedRides(matchingRides);
    setSearchMode('browse');

    if (matchingRides.length === 0) {
      setError(`No rides pass through "${filterLocation}". Try a different location.`);
    } else {
      setError('');
      toast({ title: `Found ${matchingRides.length} ride(s) through this location` });
    }
  };

  // Full search with pickup + dropoff (search mode)
  const handleFullSearch = async () => {
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      setError('Please set both pickup and dropoff locations');
      return;
    }

    setSearching(true);
    setError('');

    try {
      const requestBody = {
        userId,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropoffLat: parseFloat(dropoffLat),
        dropoffLng: parseFloat(dropoffLng),
        thresholdMeters,
        ...(departureTime && { departureTime: new Date(departureTime).toISOString() }),
      };

      const response = await fetch('/api/rides/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setDisplayedRides(data.rides);
      setSearchMode('search');
      
      toast({
        title: 'Search Complete',
        description: `Found ${data.count} matching ride(s)`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setDisplayedRides(allRides);
    setFilterLocation('');
    setFilterLat('');
    setFilterLng('');
    setPickupAddress('');
    setPickupLat('');
    setPickupLng('');
    setDropoffAddress('');
    setDropoffLat('');
    setDropoffLng('');
    setDepartureTime('');
    setSearchMode('browse');
    setError('');
  };

  // Handle booking request
  const handleBookRide = async (rideId: string) => {
    const pLat = pickupLat || filterLat;
    const pLng = pickupLng || filterLng;
    const dLat = dropoffLat || filterLat;
    const dLng = dropoffLng || filterLng;
    const pAddr = pickupAddress || filterLocation || 'Pickup location';
    const dAddr = dropoffAddress || filterLocation || 'Dropoff location';

    if (!pLat || !pLng) {
      toast({ title: 'Error', description: 'Please set your location first', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch('/api/rides/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rideId,
          pickupLat: parseFloat(pLat),
          pickupLng: parseFloat(pLng),
          pickupAddress: pAddr,
          dropoffLat: parseFloat(dLat || pLat),
          dropoffLng: parseFloat(dLng || pLng),
          dropoffAddress: dAddr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book ride');
      }

      toast({
        title: 'Request Sent!',
        description: 'Your ride request has been sent to the driver.',
      });
      
      fetchAllRides(); // Refresh list
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to book ride',
        variant: 'destructive',
      });
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
      {/* Search/Filter Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Your Ride
              </CardTitle>
              <CardDescription>
                Browse all rides or search for specific routes
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Quick Filter by Location */}
          <div className="space-y-2">
            <Label>Quick Filter: Find rides through a location</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="e.g., IIIT Hyderabad, Hitech City..."
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleGeocodeFilter()}
                />
              </div>
              <Button
                onClick={handleGeocodeFilter}
                disabled={geocodingFilter || !filterLocation.trim()}
                variant="outline"
              >
                {geocodingFilter ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
              </Button>
              <Button
                onClick={handleFilterByLocation}
                disabled={!filterLat || !filterLng}
              >
                Filter
              </Button>
            </div>
            {filterLat && filterLng && (
              <p className="text-xs text-green-600">
                ✓ Location set: {parseFloat(filterLat).toFixed(4)}, {parseFloat(filterLng).toFixed(4)}
              </p>
            )}
          </div>

          {/* Advanced Search (collapsible) */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Advanced Search: Pickup & Dropoff</h4>
              
              {/* Pickup Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  Pickup Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Where do you want to be picked up?"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleGeocodePickup()}
                  />
                  <Button
                    onClick={handleGeocodePickup}
                    disabled={geocodingPickup || !pickupAddress.trim()}
                    variant="outline"
                    size="sm"
                  >
                    {geocodingPickup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                  </Button>
                </div>
                {pickupLat && pickupLng && (
                  <p className="text-xs text-green-600">✓ Pickup set</p>
                )}
              </div>

              {/* Dropoff Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  Dropoff Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="Where do you want to go?"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleGeocodeDropoff()}
                  />
                  <Button
                    onClick={handleGeocodeDropoff}
                    disabled={geocodingDropoff || !dropoffAddress.trim()}
                    variant="outline"
                    size="sm"
                  >
                    {geocodingDropoff ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                  </Button>
                </div>
                {dropoffLat && dropoffLng && (
                  <p className="text-xs text-green-600">✓ Dropoff set</p>
                )}
              </div>

              {/* Time Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preferred Time (Optional)
                </Label>
                <Input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>

              {/* Search Radius */}
              <div className="space-y-2">
                <Label>Search Radius: {thresholdMeters}m</Label>
                <Input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={thresholdMeters}
                  onChange={(e) => setThresholdMeters(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum distance from route to your locations
                </p>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleFullSearch}
                disabled={searching || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng}
                className="w-full"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Matching Rides
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Clear Filters */}
          {(filterLat || pickupLat || searchMode === 'search') && (
            <Button onClick={handleClearFilters} variant="ghost" size="sm" className="w-full">
              <X className="h-4 w-4 mr-2" />
              Clear All Filters & Show All Rides
            </Button>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {searchMode === 'search' 
              ? `Matching Rides (${displayedRides.length})`
              : filterLat 
                ? `Rides through ${filterLocation} (${displayedRides.length})`
                : `All Available Rides (${displayedRides.length})`
            }
          </h2>
          <Button onClick={fetchAllRides} variant="ghost" size="sm">
            Refresh
          </Button>
        </div>

        {displayedRides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Navigation className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No rides found</h3>
              <p className="mt-2 text-sm text-gray-600">
                {allRides.length === 0
                  ? 'No rides available yet. Create one using the "Offer a Ride" tab!'
                  : 'Try adjusting your search filters or check back later.'}
              </p>
              {allRides.length > 0 && (
                <Button onClick={handleClearFilters} variant="outline" className="mt-4">
                  Show All {allRides.length} Rides
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedRides.map((ride) => {
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
                  {(filterLat || pickupLat) && (
                    <Button
                      onClick={() => handleBookRide(ride.id)}
                      className="mt-2 w-full"
                      disabled={(ride.availableSeats ?? ride.maxPassengers) <= 0}
                    >
                      {(ride.availableSeats ?? ride.maxPassengers) > 0
                        ? 'Request to Book'
                        : 'Fully Booked'}
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
