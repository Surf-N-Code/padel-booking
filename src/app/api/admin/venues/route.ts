import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== 'ndilthey@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all venues from Redis
    const venuesJson = await redis.get('padel:venues');
    const venues = venuesJson ? JSON.parse(venuesJson) : [];
    console.log('Venues', venues);

    return NextResponse.json(venues);
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}
