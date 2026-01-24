import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isPointOnRoute, estimateTimeToPoint, getPositionAlongRoute } from '@/lib/polyline-utils';
import { z } from 'zod';

const searchRidesSchema = z.object({
  userId: z.string().optional(),
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropoffLat: z.number(),
  dropoffLng: z.number(),
  departureTime: z.string().datetime().optional(),
  thresholdMeters: z.number().default(500),
  timeWindowHours: z.number().default(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = searchRidesSchema.parse(body);
    const userId = validatedData.userId;

    const pickupPoint = {
      lat: validatedData.pickupLat,
      lng: validatedData.pickupLng,
    };

    const dropoffPoint = {
      lat: validatedData.dropoffLat,
      lng: validatedData.dropoffLng,
    };

    // Calculate time window
    let timeFilter = {};
    if (validatedData.departureTime) {
      const departureTime = new Date(validatedData.departureTime);
      const timeWindowMs = validatedData.timeWindowHours * 60 * 60 * 1000;
      
      timeFilter = {
        departureTime: {
          gte: new Date(departureTime.getTime() - timeWindowMs),
          lte: new Date(departureTime.getTime() + timeWindowMs),
        },
      };
    }

    // Fetch all OPEN rides (excluding ghost mode rides unless user is the driver)
    const allRides = await prisma.ride.findMany({
      where: {
        status: 'OPEN',
        ...timeFilter,
        OR: [
          { ghostMode: false },
          { driverId: userId },
        ],
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        rideRequests: {
          where: {
            status: 'ACCEPTED',
          },
        },
      },
    });

    // Filter rides using the polyline matching algorithm
    const matchedRides = allRides
      .map((ride) => {
        // Check if pickup point is on the route
        const pickupMatch = isPointOnRoute(
          pickupPoint,
          ride.routePolyline,
          validatedData.thresholdMeters
        );

        // Check if dropoff point is on the route
        const dropoffMatch = isPointOnRoute(
          dropoffPoint,
          ride.routePolyline,
          validatedData.thresholdMeters
        );

        // Both pickup and dropoff must be on the route
        if (pickupMatch.isMatch && dropoffMatch.isMatch) {
          // CRITICAL: Check that pickup comes BEFORE dropoff in route direction
          // This prevents matching rides going in the opposite direction
          const pickupPosition = getPositionAlongRoute(pickupPoint, ride.routePolyline);
          const dropoffPosition = getPositionAlongRoute(dropoffPoint, ride.routePolyline);
          
          // If pickup is after dropoff, the ride is going the wrong direction
          if (pickupPosition >= dropoffPosition) {
            return null; // Reject this ride - wrong direction
          }

          // Calculate estimated pickup time based on position along route
          const timeToPickup = estimateTimeToPoint(
            pickupPoint,
            ride.routePolyline,
            ride.routeDuration
          );
          
          const estimatedPickupTime = new Date(
            ride.departureTime.getTime() + timeToPickup * 1000
          );

          // If user specified a desired departure time, check time compatibility
          let isTimeCompatible = true;
          if (validatedData.departureTime) {
            const desiredTime = new Date(validatedData.departureTime);
            const timeWindowMs = validatedData.timeWindowHours * 60 * 60 * 1000;
            
            // Check if estimated pickup time is within the acceptable window
            const timeDifferenceMs = Math.abs(
              estimatedPickupTime.getTime() - desiredTime.getTime()
            );
            
            isTimeCompatible = timeDifferenceMs <= timeWindowMs;
          }

          // Only include if time is compatible (or no time preference specified)
          if (!isTimeCompatible) {
            return null;
          }

          // Check if ride still has available seats
          const acceptedPassengers = ride.rideRequests.filter(
            (req) => req.status === 'ACCEPTED'
          ).length;
          const availableSeats = ride.maxPassengers - acceptedPassengers;

          if (availableSeats > 0) {
            return {
              ...ride,
              matchDetails: {
                pickupDistance: Math.round(pickupMatch.minDistance),
                dropoffDistance: Math.round(dropoffMatch.minDistance),
                pickupClosestPoint: pickupMatch.closestPoint,
                dropoffClosestPoint: dropoffMatch.closestPoint,
                availableSeats,
                estimatedPickupTime: estimatedPickupTime.toISOString(),
                timeToPickupMinutes: Math.round(timeToPickup / 60),
              },
            };
          }
        }

        return null;
      })
      .filter((ride) => ride !== null)
      .sort((a, b) => {
        // Sort by closest pickup distance first, then by departure time
        const distanceDiff = 
          a!.matchDetails.pickupDistance - b!.matchDetails.pickupDistance;
        
        if (Math.abs(distanceDiff) < 50) { // If distances are similar (within 50m)
          return new Date(a!.departureTime).getTime() - new Date(b!.departureTime).getTime();
        }
        
        return distanceDiff;
      });

    return NextResponse.json({
      success: true,
      rides: matchedRides,
      count: matchedRides.length,
    });
  } catch (error) {
    console.error('Error searching rides:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search rides' },
      { status: 500 }
    );
  }
}
