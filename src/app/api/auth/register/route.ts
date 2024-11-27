import { redis } from '@/lib/redis';
import { RegisterRequest, User } from '@/types/auth';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterRequest;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await redis.get(`user:${email}`);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const user: User = {
      id: nanoid(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis
    await redis.set(`user:${email}`, JSON.stringify(user));
    await redis.set(`userid:${user.id}`, email);
    await redis.sadd('users', email);

    // Return sanitized user object (without password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...sanitizedUser } = user;

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: sanitizedUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
