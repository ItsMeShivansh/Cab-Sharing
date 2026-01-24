import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updatePaymentSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['mark_paid', 'confirm_payment']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = updatePaymentSchema.parse(body);

    // Get the request with ride info
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: validatedData.requestId },
      include: {
        ride: {
          select: {
            driverId: true,
          },
        },
        passenger: {
          select: {
            id: true,
            name: true,
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

    // Validate permissions based on action
    if (validatedData.action === 'mark_paid') {
      // Passenger marks as paid
      if (rideRequest.passengerId !== validatedData.userId) {
        return NextResponse.json(
          { error: 'Only the passenger can mark payment as paid' },
          { status: 403 }
        );
      }

      if (rideRequest.paymentStatus !== 'PENDING') {
        return NextResponse.json(
          { error: 'Payment is not in pending status' },
          { status: 400 }
        );
      }

      await prisma.rideRequest.update({
        where: { id: validatedData.requestId },
        data: { paymentStatus: 'PAID' },
      });

      return NextResponse.json({
        success: true,
        message: 'Payment marked as paid. Waiting for host confirmation.',
        paymentStatus: 'PAID',
      });
    }

    if (validatedData.action === 'confirm_payment') {
      // Driver confirms payment received
      if (rideRequest.ride.driverId !== validatedData.userId) {
        return NextResponse.json(
          { error: 'Only the host can confirm payment' },
          { status: 403 }
        );
      }

      if (rideRequest.paymentStatus !== 'PAID') {
        return NextResponse.json(
          { error: 'Passenger has not marked this payment as paid yet' },
          { status: 400 }
        );
      }

      await prisma.rideRequest.update({
        where: { id: validatedData.requestId },
        data: { paymentStatus: 'CONFIRMED' },
      });

      return NextResponse.json({
        success: true,
        message: `Payment from ${rideRequest.passenger.name} confirmed`,
        paymentStatus: 'CONFIRMED',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating payment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
