import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/rides/my-rides - Get all rides created by the user with their requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all rides created by this user
    const rides = await prisma.ride.findMany({
      where: {
        driverId: userId,
      },
      include: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        departureTime: 'desc', // Most recent first
      },
    });

    // Calculate stats for each ride
    const ridesWithStats = rides.map((ride) => {
      const acceptedRequests = ride.rideRequests.filter(
        (req) => req.status === 'ACCEPTED'
      ).length;
      const pendingRequests = ride.rideRequests.filter(
        (req) => req.status === 'PENDING'
      ).length;
      const availableSeats = ride.maxPassengers - acceptedRequests;

      return {
        ...ride,
        acceptedRequests,
        pendingRequests,
        availableSeats,
      };
    });

    return NextResponse.json({
      rides: ridesWithStats,
    });
  } catch (error) {
    console.error('Error fetching my rides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rides' },
      { status: 500 }
    );
  }
}
