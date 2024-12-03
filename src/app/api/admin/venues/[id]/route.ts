import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';
import { Venue } from '@/types/game';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== 'ndilthey@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { label, venueId } = body;
    if (!label) {
      return NextResponse.json(
        { error: 'Venue name is required' },
        { status: 400 }
      );
    }

    // Get current venues
    const venuesJson = await redis.get('venues');
    const venues = venuesJson ? JSON.parse(venuesJson) : [];

    // Find and update the venue
    const updatedVenues = venues.map((venue: Venue) =>
      venue.id === venueId ? { ...venue, label } : venue
    );

    // Save back to Redis
    await redis.set('venues', JSON.stringify(updatedVenues));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update venue:', error);
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    );
  }
}
