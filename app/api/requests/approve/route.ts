import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const approveRequestSchema = z.object({
  requestId: z.string(),
  driverId: z.string(), // To verify the requester is the driver
});

// POST /api/requests/approve - Approve a ride request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = approveRequestSchema.parse(body);

    // Get the request with ride info
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: validatedData.requestId },
      include: {
        ride: {
          include: {
            rideRequests: {
              where: { status: 'ACCEPTED' },
            },
          },
        },
        passenger: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,

          },
        },
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
        { error: 'Only the driver can approve requests' },
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

    // Check if ride still has available seats
    const acceptedCount = rideRequest.ride.rideRequests.length;
    if (acceptedCount >= rideRequest.ride.maxPassengers) {
      return NextResponse.json(
        { error: 'Ride is full, cannot accept more passengers' },
        { status: 400 }
      );
    }

    // Approve the request
    const updatedRequest = await prisma.rideRequest.update({
      where: { id: validatedData.requestId },
      data: { status: 'ACCEPTED' },
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

    // Check if ride is now full and update status
    const newAcceptedCount = acceptedCount + 1;
    if (newAcceptedCount >= rideRequest.ride.maxPassengers) {
      await prisma.ride.update({
        where: { id: rideRequest.ride.id },
        data: { status: 'FULL' },
      });
    }

    // Return both driver and passenger contact info for the approved request
    return NextResponse.json({
      success: true,
      message: 'Request approved successfully',
      request: updatedRequest,
      contactInfo: {
        passenger: {
          name: updatedRequest.passenger.name,
          email: updatedRequest.passenger.email,
          phone: updatedRequest.passenger.phone,
        },
        driver: {
          name: updatedRequest.ride.driver.name,
          email: updatedRequest.ride.driver.email,
          phone: updatedRequest.ride.driver.phone,
        },
      },
    });
  } catch (error) {
    console.error('Error approving request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve request' },
      { status: 500 }
    );
  }
}
