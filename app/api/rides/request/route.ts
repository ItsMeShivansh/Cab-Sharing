import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

const createRequestSchema = z.object({
  userId: z.string(),
  rideId: z.string(),
  pickupLat: z.number(),
  pickupLng: z.number(),
  pickupAddress: z.string(),
  dropoffLat: z.number(),
  dropoffLng: z.number(),
  dropoffAddress: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createRequestSchema.parse(body);
    const userId = validatedData.userId;

    // Ensure user exists (create if not - for demo purposes)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@demo.campuspool.com`,
        name: 'Demo User',
        phone: '0000000000',
      },
    });

    // Check if ride exists and is open
    const ride = await prisma.ride.findUnique({
      where: { id: validatedData.rideId },
      include: {
        rideRequests: {
          where: {
            status: 'ACCEPTED',
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

    if (ride.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Ride is no longer available' },
        { status: 400 }
      );
    }

    if (ride.driverId === userId) {
      return NextResponse.json(
        { error: 'You cannot request your own ride' },
        { status: 400 }
      );
    }

    // Check if user already has a pending or accepted request for this ride
    const existingRequest = await prisma.rideRequest.findFirst({
      where: {
        rideId: validatedData.rideId,
        passengerId: userId,
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a request for this ride' },
        { status: 400 }
      );
    }

    // Check if ride has available seats
    const acceptedPassengers = ride.rideRequests.length;
    if (acceptedPassengers >= ride.maxPassengers) {
      return NextResponse.json(
        { error: 'Ride is full' },
        { status: 400 }
      );
    }

    // Create ride request
    const rideRequest = await prisma.rideRequest.create({
      data: {
        passengerId: userId,
        rideId: validatedData.rideId,
        pickupLat: validatedData.pickupLat,
        pickupLng: validatedData.pickupLng,
        pickupAddress: validatedData.pickupAddress,
        dropoffLat: validatedData.dropoffLat,
        dropoffLng: validatedData.dropoffLng,
        dropoffAddress: validatedData.dropoffAddress,
        status: 'PENDING',
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        ride: {
          include: {
            driver: {
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

    return NextResponse.json({
      success: true,
      request: rideRequest,
    });
  } catch (error) {
    console.error('Error creating ride request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create ride request' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user's ride requests
    const requests = await prisma.rideRequest.findMany({
      where: {
        passengerId: userId,
      },
      include: {
        ride: {
          include: {
            driver: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching ride requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ride requests' },
      { status: 500 }
    );
  }
}
