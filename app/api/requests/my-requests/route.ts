import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/requests/my-requests - Get all ride requests sent by the user
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

    // Get all ride requests made by this user
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
                trustScore: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    // For accepted requests, include driver contact info
    const requestsWithContactInfo = requests.map((req) => {
      if (req.status === 'ACCEPTED') {
        return {
          ...req,
          driverContact: {
            name: req.ride.driver.name,
            email: req.ride.driver.email,
            phone: req.ride.driver.phone,
          },
        };
      }
      return {
        ...req,
        driverContact: null,
      };
    });

    return NextResponse.json({
      requests: requestsWithContactInfo,
    });
  } catch (error) {
    console.error('Error fetching my requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
