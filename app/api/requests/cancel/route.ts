import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const cancelRequestSchema = z.object({
  requestId: z.string(),
  passengerId: z.string(), // To verify the requester is the passenger
});

// POST /api/requests/cancel - Cancel a ride request (by passenger)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = cancelRequestSchema.parse(body);

    // Get the request
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
      },
    });

    if (!rideRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify the requester is the passenger who made this request
    if (rideRequest.passengerId !== validatedData.passengerId) {
      return NextResponse.json(
        { error: 'Only the passenger can cancel their own request' },
        { status: 403 }
      );
    }

    // Check if request is already cancelled/rejected
    if (rideRequest.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Request is already cancelled' },
        { status: 400 }
      );
    }

    if (rideRequest.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Request was already rejected' },
        { status: 400 }
      );
    }

    const wasAccepted = rideRequest.status === 'ACCEPTED';

    // Cancel the request
    const updatedRequest = await prisma.rideRequest.update({
      where: { id: validatedData.requestId },
      data: { status: 'CANCELLED' },
    });

    // If this was an accepted request and ride was FULL, reopen it
    if (wasAccepted && rideRequest.ride.status === 'FULL') {
      // Check if there's now space available
      const remainingAccepted = rideRequest.ride.rideRequests.length - 1; // -1 for this cancelled one
      if (remainingAccepted < rideRequest.ride.maxPassengers) {
        await prisma.ride.update({
          where: { id: rideRequest.ride.id },
          data: { status: 'OPEN' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: wasAccepted 
        ? 'Your confirmed ride has been cancelled. The driver has been notified.'
        : 'Your ride request has been cancelled.',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error cancelling request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel request' },
      { status: 500 }
    );
  }
}
