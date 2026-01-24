import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const rejectRequestSchema = z.object({
  requestId: z.string(),
  driverId: z.string(), // To verify the requester is the driver
});

// POST /api/requests/reject - Reject a ride request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = rejectRequestSchema.parse(body);

    // Get the request with ride info
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: validatedData.requestId },
      include: {
        ride: true,
      },
    });

    if (!rideRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify the requester is the driver of this ride
    if (rideRequest.ride.driverId !== validatedData.driverId) {
      return NextResponse.json(
        { error: 'Only the driver can reject requests' },
        { status: 403 }
      );
    }

    // Check if request is still pending
    if (rideRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request is already ${rideRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Reject the request
    const updatedRequest = await prisma.rideRequest.update({
      where: { id: validatedData.requestId },
      data: { status: 'REJECTED' },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            trustScore: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Request rejected',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error rejecting request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reject request' },
      { status: 500 }
    );
  }
}
