import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { decodePolyline } from '@/lib/polyline-utils';

const prisma = new PrismaClient();

const completeRideSchema = z.object({
  rideId: z.string().min(1, 'Ride ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  totalCost: z.number().positive('Total cost must be positive'),
});

/**
 * COST SPLITTING ALGORITHM - SEGMENT BASED FAIR SPLIT
 * ====================================================
 * 
 * IMPORTANT: The HOST is always counted as traveling the FULL route (0% to 100%).
 * When splitting segment costs, we divide by (host + passengers on that segment).
 * 
 * EXAMPLE:
 * --------
 * Route: A -------- B -------- C -------- D (equal segments, ₹100 total)
 *        0%        33%        66%       100%
 * 
 * Host: Travels A → D (full route, 0% to 100%)
 * Passenger: Travels B → C only (33% to 66%)
 * 
 * Segments & Cost Split:
 * ━━━━━━━━━━━━━━━━━━━━━━━
 * Segment A→B (0-33%): 
 *   - Cost: 33.33 rupees
 *   - People: Host only (1 person)
 *   - Host pays: 33.33, Passenger pays: 0
 * 
 * Segment B→C (33-66%):
 *   - Cost: 33.33 rupees  
 *   - People: Host + Passenger (2 people)
 *   - Each pays: 33.33 / 2 = 16.67
 *   - Host pays: 16.67, Passenger pays: 16.67
 * 
 * Segment C→D (66-100%):
 *   - Cost: 33.33 rupees
 *   - People: Host only (1 person)
 *   - Host pays: 33.33, Passenger pays: 0
 * 
 * FINAL RESULT:
 * ━━━━━━━━━━━━━
 * Passenger owes: 0 + 16.67 + 0 = ₹16.67
 * Host's net cost: 100 - 16.67 = ₹83.33
 * 
 * This is FAIR because:
 * - Passenger only pays for segment B→C that they actually used
 * - On shared segments, cost is split equally among all travelers
 * - Host bears the full cost of segments where they travel alone
 */

interface Segment {
  start: number;  // Position along route (0-1)
  end: number;    // Position along route (0-1)
  passengerIds: string[];  // Who's on this segment
}

interface PassengerPosition {
  requestId: string;
  passengerId: string;
  pickupPosition: number;
  dropoffPosition: number;
}

function calculateFairCostSplit(
  passengers: PassengerPosition[],
  totalCost: number,
  totalDistanceMeters: number
): { 
  costMap: Map<string, { amount: number; distanceKm: number }>;
  segments: Array<{ start: number; end: number; peopleCount: number; passengerNames: string[]; segmentCost: number; perPersonCost: number; passengerShare: number }>;
  hostShare: number;
} {
  const costMap = new Map<string, { amount: number; distanceKm: number }>();
  const segments: Array<{ start: number; end: number; peopleCount: number; passengerNames: string[]; segmentCost: number; perPersonCost: number; passengerShare: number }> = [];
  let hostShare = 0;
  
  if (passengers.length === 0) {
    return { costMap, segments, hostShare: totalCost };
  }
  
  // Initialize all passengers with 0
  passengers.forEach(p => {
    costMap.set(p.requestId, { amount: 0, distanceKm: 0 });
  });
  
  // Collect all unique positions INCLUDING route start (0) and end (1) for the host
  const positions = new Set<number>();
  positions.add(0);  // Host starts at beginning
  positions.add(1);  // Host ends at destination
  
  passengers.forEach(p => {
    positions.add(p.pickupPosition);
    positions.add(p.dropoffPosition);
  });
  
  // Sort positions to create segments
  const sortedPositions = Array.from(positions).sort((a, b) => a - b);
  
  // Process each segment between consecutive positions
  for (let i = 0; i < sortedPositions.length - 1; i++) {
    const segmentStart = sortedPositions[i];
    const segmentEnd = sortedPositions[i + 1];
    const segmentFraction = segmentEnd - segmentStart;  // Fraction of total route
    
    if (segmentFraction <= 0) continue;
    
    // Calculate segment cost (proportional to route length)
    const segmentCost = segmentFraction * totalCost;
    const segmentDistanceKm = (segmentFraction * totalDistanceMeters) / 1000;
    
    // Find which PASSENGERS are traveling on this segment
    // A passenger is on a segment if their pickup <= segment start AND dropoff >= segment end
    const passengersOnSegment = passengers.filter(p => {
      return p.pickupPosition <= segmentStart && p.dropoffPosition >= segmentEnd;
    });
    
    // Total people on segment = HOST (always 1) + passengers on this segment
    const totalPeopleOnSegment = 1 + passengersOnSegment.length;  // +1 for host!
    
    // Cost per person on this segment
    const costPerPerson = segmentCost / totalPeopleOnSegment;
    
    // Host's share of this segment
    hostShare += costPerPerson;
    
    // Total that passengers pay for this segment
    const passengerShareForSegment = segmentCost - costPerPerson;  // Total minus host's share
    
    // Record segment for debugging
    segments.push({
      start: Math.round(segmentStart * 100),
      end: Math.round(segmentEnd * 100),
      peopleCount: totalPeopleOnSegment,
      passengerNames: passengersOnSegment.map(p => p.requestId),
      segmentCost: Math.round(segmentCost * 100) / 100,
      perPersonCost: Math.round(costPerPerson * 100) / 100,
      passengerShare: Math.round(passengerShareForSegment * 100) / 100,
    });
    
    // Add to each passenger's total
    passengersOnSegment.forEach(p => {
      const current = costMap.get(p.requestId)!;
      costMap.set(p.requestId, {
        amount: current.amount + costPerPerson,
        distanceKm: current.distanceKm + segmentDistanceKm,
      });
    });
  }
  
  return { costMap, segments, hostShare: Math.round(hostShare * 100) / 100 };
}

// Calculate position along a polyline route
function getPositionAlongRoute(
  point: { lat: number; lng: number },
  routePolyline: string
): number {
  const routePoints = decodePolyline(routePolyline);
  
  if (routePoints.length < 2) return 0;
  
  let minDistance = Infinity;
  let closestIndex = 0;
  
  // Find closest point on route
  for (let i = 0; i < routePoints.length; i++) {
    const routePoint = routePoints[i];
    const distance = Math.sqrt(
      Math.pow(point.lat - routePoint.lat, 2) +
      Math.pow(point.lng - routePoint.lng, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  // Return position as fraction (0-1)
  return closestIndex / (routePoints.length - 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = completeRideSchema.parse(body);

    // Get the ride with accepted requests
    const ride = await prisma.ride.findUnique({
      where: { id: validatedData.rideId },
      include: {
        rideRequests: {
          where: { status: 'ACCEPTED' },
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    // Verify the user is the driver
    if (ride.driverId !== validatedData.userId) {
      return NextResponse.json(
        { error: 'Only the host can complete this ride' },
        { status: 403 }
      );
    }

    // Check ride status
    if (ride.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Ride is already completed' },
        { status: 400 }
      );
    }

    if (ride.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot complete a cancelled ride' },
        { status: 400 }
      );
    }

    // Calculate positions for each passenger along the route
    const passengers: PassengerPosition[] = ride.rideRequests.map((request: any) => ({
      requestId: request.id,
      passengerId: request.passengerId,
      pickupPosition: request.pickupPosition ?? getPositionAlongRoute(
        { lat: request.pickupLat, lng: request.pickupLng },
        ride.routePolyline
      ),
      dropoffPosition: request.dropoffPosition ?? getPositionAlongRoute(
        { lat: request.dropoffLat, lng: request.dropoffLng },
        ride.routePolyline
      ),
    }));

    // Calculate fair cost split
    const { costMap: costSplit, segments, hostShare } = calculateFairCostSplit(
      passengers,
      validatedData.totalCost,
      ride.routeDistance
    );

    // Calculate total passenger payments
    let totalPassengerPayments = 0;
    costSplit.forEach(({ amount }) => {
      totalPassengerPayments += amount;
    });

    // Update ride and all requests in a transaction
    const updatedRide = await prisma.$transaction(async (tx: any) => {
      // Update ride status and total cost
      const updated = await tx.ride.update({
        where: { id: validatedData.rideId },
        data: {
          status: 'COMPLETED',
          totalCost: validatedData.totalCost,
        },
      });

      // Update each passenger's payment info
      const entries = Array.from(costSplit.entries());
      for (const [requestId, { amount, distanceKm }] of entries) {
        const passenger = passengers.find(p => p.requestId === requestId);
        await tx.rideRequest.update({
          where: { id: requestId },
          data: {
            amountOwed: Math.round(amount * 100) / 100, // Round to 2 decimal places
            distanceKm: Math.round(distanceKm * 100) / 100,
            pickupPosition: passenger?.pickupPosition,
            dropoffPosition: passenger?.dropoffPosition,
            paymentStatus: 'PENDING',
          },
        });
      }

      return updated;
    });

    // Prepare response with cost breakdown
    const costBreakdown = ride.rideRequests.map((request: any) => {
      const split = costSplit.get(request.id);
      const passengerInfo = passengers.find(p => p.requestId === request.id);
      return {
        passengerId: request.passengerId,
        passengerName: request.passenger.name,
        passengerEmail: request.passenger.email,
        pickupAddress: request.pickupAddress,
        dropoffAddress: request.dropoffAddress,
        pickupPosition: passengerInfo ? Math.round(passengerInfo.pickupPosition * 100) : 0,
        dropoffPosition: passengerInfo ? Math.round(passengerInfo.dropoffPosition * 100) : 0,
        distanceKm: split ? Math.round(split.distanceKm * 100) / 100 : 0,
        amountOwed: split ? Math.round(split.amount * 100) / 100 : 0,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Ride completed successfully',
      ride: {
        id: updatedRide.id,
        totalCost: validatedData.totalCost,
        totalDistanceKm: Math.round(ride.routeDistance / 10) / 100,
        status: 'COMPLETED',
      },
      costBreakdown,
      segments,
      summary: {
        totalCost: validatedData.totalCost,
        hostShare: hostShare,
        hostNetCost: Math.round((validatedData.totalCost - totalPassengerPayments) * 100) / 100,
        totalFromPassengers: Math.round(totalPassengerPayments * 100) / 100,
      },
      algorithm: {
        name: 'Segment-Based Fair Splitting (Host Included)',
        description: 'Route is divided into segments. Each segment cost is split equally among ALL people on that segment (Host + Passengers). Host always travels full route (0% to 100%).',
        example: 'If Host goes A→D and Passenger goes B→C: Segment A→B = Host pays full, Segment B→C = split 50/50, Segment C→D = Host pays full.',
      },
    });
  } catch (error) {
    console.error('Error completing ride:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to complete ride' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch cost breakdown for a completed ride
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rideId = searchParams.get('rideId');

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      );
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
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
          where: { status: 'ACCEPTED' },
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    const costBreakdown = ride.rideRequests.map((request: any) => ({
      requestId: request.id,
      passengerId: request.passengerId,
      passengerName: request.passenger.name,
      passengerEmail: request.passenger.email,
      passengerPhone: request.passenger.phone,
      pickupAddress: request.pickupAddress,
      dropoffAddress: request.dropoffAddress,
      distanceKm: request.distanceKm,
      amountOwed: request.amountOwed,
      paymentStatus: request.paymentStatus,
    }));

    return NextResponse.json({
      success: true,
      ride: {
        id: ride.id,
        originAddress: ride.originAddress,
        destAddress: ride.destAddress,
        departureTime: ride.departureTime,
        totalCost: (ride as any).totalCost,
        totalDistanceKm: Math.round(ride.routeDistance / 10) / 100,
        status: ride.status,
        driver: ride.driver,
      },
      costBreakdown,
    });
  } catch (error) {
    console.error('Error fetching ride cost breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost breakdown' },
      { status: 500 }
    );
  }
}
