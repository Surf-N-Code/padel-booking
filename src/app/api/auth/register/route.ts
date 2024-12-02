import { redis } from '@/lib/redis';
import { RegisterRequest, User } from '@/types/auth';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterRequest;
    const { email, password, name, telegramId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await redis.get(`user:${email}`);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // If telegramId is provided, check if it's already registered
    if (telegramId) {
      const existingTelegramUser = await redis.get(`telegram:${telegramId}`);
      if (existingTelegramUser) {
        return NextResponse.json(
          { error: 'Telegram ID already registered' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const userId = nanoid();
    const user: User = {
      id: userId,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      name,
      telegramId,
    };

    // Store in Redis
    await redis.set(`user:${email}`, JSON.stringify(user));
    await redis.set(`userid:${userId}`, email);
    await redis.sadd('users', email);

    // If telegramId is provided, create the telegram:id -> userId mapping
    if (telegramId) {
      await redis.set(`telegram:${telegramId}`, userId);
    }

    // Return sanitized user object (without password)
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
