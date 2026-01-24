'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock, Eye, EyeOff, Navigation } from 'lucide-react';
import { format } from 'date-fns';

interface MatchDetails {
  pickupDistance: number;
  dropoffDistance: number;
  availableSeats: number;
  estimatedPickupTime?: string;
  timeToPickupMinutes?: number;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface Passenger {
  id: string;
  name: string;
}

interface RideCardProps {
  ride: {
    id: string;
    originAddress: string;
    destAddress: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    departureTime: Date | string;
    maxPassengers: number;
    ghostMode: boolean;
    status: string;
    driver: Driver;
    availableSeats?: number;
    passengers?: Passenger[];
    matchDetails?: MatchDetails;
  };
  onRequestRide?: (rideId: string) => void;
  showDriverInfo?: boolean;
  isOwnRide?: boolean;
}

export function RideCard({ ride, onRequestRide, showDriverInfo = false, isOwnRide = false }: RideCardProps) {
  const departureDate = typeof ride.departureTime === 'string' 
    ? new Date(ride.departureTime) 
    : ride.departureTime;

  // Use availableSeats from ride object first, then matchDetails, then fallback to maxPassengers
  const availableSeats = ride.availableSeats ?? ride.matchDetails?.availableSeats ?? ride.maxPassengers;
  const filledSeats = ride.maxPassengers - availableSeats;

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <span className="truncate">{ride.originAddress}</span>
            </CardTitle>
            <CardDescription className="mt-2 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-red-600" />
              <span className="truncate">{ride.destAddress}</span>
            </CardDescription>
          </div>
          {ride.ghostMode && (
            <div className="ml-2 flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              <EyeOff className="h-3 w-3" />
              Ghost
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(departureDate, 'PPp')}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {filledSeats}/{ride.maxPassengers} seats filled ({availableSeats} available)
          </span>
        </div>

        {/* Show passengers who have booked this ride */}
        {ride.passengers && ride.passengers.length > 0 && (
          <div className="mt-2 p-3 bg-green-50 rounded-md">
            <div className="text-sm font-medium text-green-800 mb-2">
              Passengers ({ride.passengers.length}):
            </div>
            <div className="space-y-1">
              {ride.passengers.map((passenger) => (
                <div key={passenger.id} className="text-sm text-green-700">
                  {passenger.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {ride.matchDetails && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md space-y-1">
            <div className="flex items-center gap-2 text-sm text-blue-900">
              <MapPin className="h-4 w-4" />
              <span>Pickup: {ride.matchDetails.pickupDistance}m from route</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-900">
              <Navigation className="h-4 w-4" />
              <span>Dropoff: {ride.matchDetails.dropoffDistance}m from route</span>
            </div>
            {ride.matchDetails.estimatedPickupTime && (
              <div className="flex items-center gap-2 text-sm text-blue-900 font-medium">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated pickup: {format(new Date(ride.matchDetails.estimatedPickupTime), 'p')}
                  {ride.matchDetails.timeToPickupMinutes !== undefined && 
                    ` (${ride.matchDetails.timeToPickupMinutes} min from departure)`
                  }
                </span>
              </div>
            )}
          </div>
        )}

        {showDriverInfo && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="text-sm font-medium">Host</div>
            <div className="text-sm text-muted-foreground">{ride.driver.name}</div>
            <div className="text-xs text-muted-foreground">{ride.driver.email}</div>
            {ride.driver.phone && (
              <div className="text-xs text-muted-foreground mt-1">
                Phone: {ride.driver.phone}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {ride.originLat && ride.originLng && ride.destLat && ride.destLng && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${ride.originLat},${ride.originLng}&destination=${ride.destLat},${ride.destLng}`, '_blank')}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            View Route on Google Maps
          </Button>
        )}
        
        {!isOwnRide && onRequestRide && ride.status === 'OPEN' && availableSeats > 0 && (
          <Button 
            onClick={() => onRequestRide(ride.id)} 
            className="w-full"
          >
            Request Ride
          </Button>
        )}
        {isOwnRide && (
          <div className="w-full text-center text-sm text-muted-foreground">
            Your ride
          </div>
        )}
        {ride.status !== 'OPEN' && (
          <div className="w-full text-center text-sm text-muted-foreground">
            Ride {ride.status.toLowerCase()}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
