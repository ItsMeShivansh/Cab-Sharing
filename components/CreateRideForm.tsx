'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateRideFormProps {
  userId: string;
  onRideCreated?: () => void;
}

export function CreateRideForm({ userId, onRideCreated }: CreateRideFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [geocodingOrigin, setGeocodingOrigin] = useState(false);
  const [geocodingDest, setGeocodingDest] = useState(false);
  const [formData, setFormData] = useState({
    originAddress: '',
    originLat: 0,
    originLng: 0,
    destAddress: '',
    destLat: 0,
    destLng: 0,
    departureTime: '',
    maxPassengers: 3,
    ghostMode: false,
  });

  // Geocode origin address
  const handleGeocodeOrigin = async () => {
    if (!formData.originAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a pickup location',
        variant: 'destructive',
      });
      return;
    }

    setGeocodingOrigin(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: formData.originAddress }),
      });

      const data = await response.json();
      if (data.success && data.coordinates) {
        setFormData({
          ...formData,
          originLat: data.coordinates.lat,
          originLng: data.coordinates.lng,
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
      setGeocodingOrigin(false);
    }
  };

  // Geocode destination address
  const handleGeocodeDest = async () => {
    if (!formData.destAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a destination',
        variant: 'destructive',
      });
      return;
    }

    setGeocodingDest(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: formData.destAddress }),
      });

      const data = await response.json();
      if (data.success && data.coordinates) {
        setFormData({
          ...formData,
          destLat: data.coordinates.lat,
          destLng: data.coordinates.lng,
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
      setGeocodingDest(false);
    }
  };

  // For demo purposes, we'll use simple text inputs
  // In production, integrate Google Places Autocomplete
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate coordinates
      if (formData.originLat === 0 && formData.originLng === 0) {
        throw new Error('Please enter valid pickup coordinates');
      }
      if (formData.destLat === 0 && formData.destLng === 0) {
        throw new Error('Please enter valid destination coordinates');
      }
      if (formData.originLat < -90 || formData.originLat > 90) {
        throw new Error('Pickup latitude must be between -90 and 90');
      }
      if (formData.originLng < -180 || formData.originLng > 180) {
        throw new Error('Pickup longitude must be between -180 and 180');
      }
      if (formData.destLat < -90 || formData.destLat > 90) {
        throw new Error('Destination latitude must be between -90 and 90');
      }
      if (formData.destLng < -180 || formData.destLng > 180) {
        throw new Error('Destination longitude must be between -180 and 180');
      }

      // Convert datetime-local to ISO 8601 format with timezone
      const departureDateTime = new Date(formData.departureTime).toISOString();
      
      const response = await fetch('/api/rides/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...formData, 
          departureTime: departureDateTime,
          userId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ride');
      }

      toast({
        title: 'Ride Created!',
        description: 'Your ride has been successfully created.',
      });

      // Reset form
      setFormData({
        originAddress: '',
        originLat: 0,
        originLng: 0,
        destAddress: '',
        destLat: 0,
        destLng: 0,
        departureTime: '',
        maxPassengers: 3,
        ghostMode: false,
      });

      if (onRideCreated) {
        onRideCreated();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create ride',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Ride</CardTitle>
        <CardDescription>Offer a ride to fellow IIIT students</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="originAddress">Pickup Location</Label>
            <div className="flex gap-2">
              <Input
                id="originAddress"
                placeholder="e.g., IIIT Hyderabad, Gachibowli"
                value={formData.originAddress}
                onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
                required
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleGeocodeOrigin}
                disabled={geocodingOrigin}
                variant="outline"
              >
                {geocodingOrigin ? 'Finding...' : 'Find'}
              </Button>
            </div>
            {formData.originLat !== 0 && formData.originLng !== 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded flex items-center justify-between">
                <span>📍 Coordinates: {formData.originLat.toFixed(6)}, {formData.originLng.toFixed(6)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${formData.originLat},${formData.originLng}`, '_blank')}
                  className="text-xs"
                >
                  Show on Maps
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destAddress">Destination</Label>
            <div className="flex gap-2">
              <Input
                id="destAddress"
                placeholder="e.g., Hitech City, Hyderabad Airport"
                value={formData.destAddress}
                onChange={(e) => setFormData({ ...formData, destAddress: e.target.value })}
                required
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleGeocodeDest}
                disabled={geocodingDest}
                variant="outline"
              >
                {geocodingDest ? 'Finding...' : 'Find'}
              </Button>
            </div>
            {formData.destLat !== 0 && formData.destLng !== 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded flex items-center justify-between">
                <span>📍 Coordinates: {formData.destLat.toFixed(6)}, {formData.destLng.toFixed(6)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${formData.destLat},${formData.destLng}`, '_blank')}
                  className="text-xs"
                >
                  Show on Maps
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="departureTime">Departure Time</Label>
            <Input
              id="departureTime"
              type="datetime-local"
              value={formData.departureTime}
              onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPassengers">Maximum Passengers</Label>
            <Input
              id="maxPassengers"
              type="number"
              min="1"
              max="6"
              value={formData.maxPassengers}
              onChange={(e) => setFormData({ ...formData, maxPassengers: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* <Switch
              id="ghostMode"
              checked={formData.ghostMode}
              onCheckedChange={(checked) => setFormData({ ...formData, ghostMode: checked })}
            />
            <Label htmlFor="ghostMode" className="cursor-pointer">
              Ghost Mode (Only visible to matching passengers)
            </Label> */}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Ride...
              </>
            ) : (
              'Create Ride'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
