import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all future rides (departure time is in the future)
    const rides = await prisma.ride.findMany({
      where: {
        departureTime: {
          gte: new Date(), // Only future rides
        },
        status: 'OPEN', // Only open rides
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            trustScore: true,
          },
        },
        rideRequests: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        departureTime: 'asc', // Soonest rides first
      },
      take: limit,
      skip: offset,
    });

    // Calculate available seats for each ride
    const ridesWithAvailability = rides.map((ride) => {
      const acceptedRequests = ride.rideRequests.filter(
        (req) => req.status === 'ACCEPTED'
      ).length;
      const availableSeats = ride.maxPassengers - acceptedRequests;

      return {
        ...ride,
        availableSeats,
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.ride.count({
      where: {
        departureTime: {
          gte: new Date(),
        },
        status: 'OPEN',
      },
    });

    return NextResponse.json({
      rides: ridesWithAvailability,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching rides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rides' },
      { status: 500 }
    );
  }
}
