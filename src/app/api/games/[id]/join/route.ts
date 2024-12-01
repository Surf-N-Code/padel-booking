import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { player } = await req.json();

    // Validate player data
    if (!player || !player.name) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    // Check if game exists
    const gameExists = await redis.exists(`game:${params.id}`);
    if (!gameExists) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get current players
    const currentPlayers = await redis.smembers(`game:${params.id}:players`);
    if (currentPlayers.length >= 4) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Add player to game
    await redis.sadd(`game:${params.id}:players`, JSON.stringify(player));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to join game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
