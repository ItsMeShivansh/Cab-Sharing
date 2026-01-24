import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/google-maps';
import { z } from 'zod';

const geocodeSchema = z.object({
  address: z.string().min(1),
});

// Support GET requests with query parameters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required', success: false },
        { status: 400 }
      );
    }

    const { address: validatedAddress } = geocodeSchema.parse({ address });
    const coordinates = await geocodeAddress(validatedAddress);

    return NextResponse.json({
      success: true,
      lat: coordinates.lat,
      lng: coordinates.lng,
      ...coordinates,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to geocode address',
        success: false,
      },
      { status: 400 }
    );
  }
}

// Keep POST support for backward compatibility
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address } = geocodeSchema.parse(body);

    const coordinates = await geocodeAddress(address);

    return NextResponse.json({
      success: true,
      coordinates,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to geocode address',
        success: false,
      },
      { status: 400 }
    );
  }
}
