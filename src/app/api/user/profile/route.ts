import { redis } from '@/lib/redis';
import { User } from '@/types/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userJson = await redis.get(`user:${session.user.email}`);
    if (!userJson) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = JSON.parse(userJson) as User;
    const { password: _, ...sanitizedUser } = user;
    return NextResponse.json(sanitizedUser);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      lastName,
      email,
      currentPassword,
      newPassword,
      padelLevel,
      favoriteVenues,
    } = body;

    // Get current user
    const userJson = await redis.get(`user:${session.user.email}`);
    if (!userJson) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = JSON.parse(userJson) as User;

    // If changing password, verify current password
    if (currentPassword && newPassword) {
      const passwordsMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!passwordsMatch) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update user fields
    const updatedUser: User = {
      ...user,
      name: name || user.name,
      lastName: lastName || user.lastName,
      padelLevel: padelLevel || user.padelLevel,
      favoriteVenues: favoriteVenues || user.favoriteVenues,
    };

    // If email is changing, need to update Redis keys
    if (email && email !== session.user.email) {
      const existingUser = await redis.get(`user:${email}`);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }

      // Delete old email key and create new one
      await redis.del(`user:${session.user.email}`);
      await redis.set(`user:${email}`, JSON.stringify(updatedUser));
      await redis.set(`userid:${user.id}`, email);
      await redis.srem('users', session.user.email);
      await redis.sadd('users', email);
    } else {
      // Just update the existing user
      await redis.set(
        `user:${session.user.email}`,
        JSON.stringify(updatedUser)
      );
    }

    // Return sanitized user object
    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json(sanitizedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
