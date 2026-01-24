'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { RideCard } from './RideCard';

interface SearchRidesFormProps {
  userId: string;
  onSearch?: (rides: any[]) => void;
}

export function SearchRidesForm({ userId, onSearch }: SearchRidesFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDropoff, setGeocodingDropoff] = useState(false);
  const [rides, setRides] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupLat: 0,
    pickupLng: 0,
    dropoffAddress: '',
    dropoffLat: 0,
    dropoffLng: 0,
    departureTime: '',
    thresholdMeters: 500,
  });
  // Geocode pickup address
  const handleGeocodePickup = async () => {
    if (!formData.pickupAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a pickup location',
        variant: 'destructive',
      });
      return;
    }

    setGeocodingPickup(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: formData.pickupAddress }),
      });

      const data = await response.json();
      if (data.success && data.coordinates) {
        setFormData({
          ...formData,
          pickupLat: data.coordinates.lat,
          pickupLng: data.coordinates.lng,
        });
        toast({
          title: 'Location found!',
          description: `${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)}`,
        });
      } else {
        throw new Error(data.error || 'Failed to find location');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to geocode address',
        variant: 'destructive',
      });
    } finally {
      setGeocodingPickup(false);
    }
  };

  // Geocode dropoff address
  const handleGeocodeDropoff = async () => {
    if (!formData.dropoffAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a dropoff location',
        variant: 'destructive',
      });
      return;
    }

    setGeocodingDropoff(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: formData.dropoffAddress }),
      });

      const data = await response.json();
      if (data.success && data.coordinates) {
        setFormData({
          ...formData,
          dropoffLat: data.coordinates.lat,
          dropoffLng: data.coordinates.lng,
        });
        toast({
          title: 'Location found!',
          description: `${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)}`,
        });
      } else {
        throw new Error(data.error || 'Failed to find location');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to geocode address',
        variant: 'destructive',
      });
    } finally {
      setGeocodingDropoff(false);
    }
  };
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestBody = {
        userId,
        pickupLat: formData.pickupLat,
        pickupLng: formData.pickupLng,
        dropoffLat: formData.dropoffLat,
        dropoffLng: formData.dropoffLng,
        thresholdMeters: formData.thresholdMeters,
        ...(formData.departureTime && {
          departureTime: new Date(formData.departureTime).toISOString(),
        }),
      };

      const response = await fetch('/api/rides/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search rides');
      }

      setRides(data.rides);
      
      if (onSearch) {
        onSearch(data.rides);
      }

      toast({
        title: 'Search Complete',
        description: `Found ${data.count} matching ride${data.count !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to search rides',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRide = async (rideId: string) => {
    try {
      const response = await fetch('/api/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          rideId,
          pickupLat: formData.pickupLat,
          pickupLng: formData.pickupLng,
          pickupAddress: formData.pickupAddress,
          dropoffLat: formData.dropoffLat,
          dropoffLng: formData.dropoffLng,
          dropoffAddress: formData.dropoffAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request ride');
      }

      toast({
        title: 'Request Sent!',
        description: 'Your ride request has been sent to the driver.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request ride',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search for Rides</CardTitle>
          <CardDescription>Find rides along your route</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickupAddress">Your Pickup Location</Label>
              <div className="flex gap-2">
                <Input
                  id="pickupAddress"
                  placeholder="e.g., IIIT Hyderabad"
                  value={formData.pickupAddress}
                  onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                  required
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleGeocodePickup}
                  disabled={geocodingPickup}
                  variant="outline"
                >
                  {geocodingPickup ? 'Finding...' : 'Find'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={formData.pickupLat || ''}
                  onChange={(e) => setFormData({ ...formData, pickupLat: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={formData.pickupLng || ''}
                  onChange={(e) => setFormData({ ...formData, pickupLng: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropoffAddress">Your Destination</Label>
              <div className="flex gap-2">
                <Input
                  id="dropoffAddress"
                  placeholder="e.g., Hitech City"
                  value={formData.dropoffAddress}
                  onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
                  required
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleGeocodeDropoff}
                  disabled={geocodingDropoff}
                  variant="outline"
                >
                  {geocodingDropoff ? 'Finding...' : 'Find'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={formData.dropoffLat || ''}
                  onChange={(e) => setFormData({ ...formData, dropoffLat: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={formData.dropoffLng || ''}
                  onChange={(e) => setFormData({ ...formData, dropoffLng: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime">Preferred Departure Time (Optional)</Label>
              <Input
                id="departureTime"
                type="datetime-local"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thresholdMeters">Search Radius (meters)</Label>
              <Input
                id="thresholdMeters"
                type="number"
                min="100"
                max="2000"
                step="100"
                value={formData.thresholdMeters}
                onChange={(e) => setFormData({ ...formData, thresholdMeters: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum distance from your location to driver's route
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search Rides'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {rides.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Matching Rides ({rides.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                onRequestRide={handleRequestRide}
                showDriverInfo={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
