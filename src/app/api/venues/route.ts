import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const locations = await redis.get('padel:locations');

    if (!locations) {
      return NextResponse.json([]);
    }

    const parsedLocations = JSON.parse(locations) as Array<{
      name: string;
      link: string;
      addressLines: string[];
    }>;

    // Transform locations to venue format
    const venues = parsedLocations.map((location) => ({
      value: location.name.toLowerCase().replace(/\s+/g, '-'),
      label: location.name,
    }));

    return NextResponse.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}
