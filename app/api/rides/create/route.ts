import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDirections } from '@/lib/google-maps';
import { z } from 'zod';

const createRideSchema = z.object({
  userId: z.string(),
  originLat: z.number(),
  originLng: z.number(),
  originAddress: z.string(),
  destLat: z.number(),
  destLng: z.number(),
  destAddress: z.string(),
  departureTime: z.string().datetime(),
  maxPassengers: z.number().min(1).max(6).default(3),
  ghostMode: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createRideSchema.parse(body);
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

    // Get route from Google Directions API
    const directions = await getDirections(
      { lat: validatedData.originLat, lng: validatedData.originLng },
      { lat: validatedData.destLat, lng: validatedData.destLng }
    );

    if (!directions.routes || directions.routes.length === 0) {
      return NextResponse.json(
        { error: 'No route found between the specified locations' },
        { status: 400 }
      );
    }

    const route = directions.routes[0];
    const encodedPolyline = route.overview_polyline.points;
    
    // Extract route duration and distance from the first leg
    const routeDuration = route.legs[0]?.duration?.value || 0; // in seconds
    const routeDistance = route.legs[0]?.distance?.value || 0; // in meters

    // Create ride in database
    const ride = await prisma.ride.create({
      data: {
        driverId: userId,
        originLat: validatedData.originLat,
        originLng: validatedData.originLng,
        originAddress: validatedData.originAddress,
        destLat: validatedData.destLat,
        destLng: validatedData.destLng,
        destAddress: validatedData.destAddress,
        departureTime: new Date(validatedData.departureTime),
        routePolyline: encodedPolyline,
        routeDuration,
        routeDistance,
        maxPassengers: validatedData.maxPassengers,
        ghostMode: validatedData.ghostMode,
        status: 'OPEN',
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            trustScore: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      ride: {
        ...ride,
        routeInfo: {
          duration: route.legs[0].duration,
          distance: route.legs[0].distance,
        },
      },
    });
  } catch (error) {
    console.error('Error creating ride:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create ride' },
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

    // Get user's rides as driver
    const rides = await prisma.ride.findMany({
      where: {
        driverId: userId,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            trustScore: true,
          },
        },
        rideRequests: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                trustScore: true,
              },
            },
          },
        },
      },
      orderBy: {
        departureTime: 'desc',
      },
    });

    return NextResponse.json({ rides });
  } catch (error) {
    console.error('Error fetching rides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rides' },
      { status: 500 }
    );
  }
}
