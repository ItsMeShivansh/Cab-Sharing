import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, createToken } from '@/lib/auth';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

function generateId(): string {
  return 'c' + randomBytes(12).toString('hex').slice(0, 24);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = generateId();
    const now = new Date().toISOString();

    // Create user using raw query
    await prisma.$executeRaw`
      INSERT INTO users (id, email, name, phone, password, trust_score, created_at, updated_at)
      VALUES (${userId}, ${email}, ${name}, ${phone || ''}, ${hashedPassword}, 100, ${now}, ${now})
    `;

    // Create JWT token
    const token = createToken({
      userId,
      email,
      name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        trustScore: 100,
      },
    });

    // Set cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
