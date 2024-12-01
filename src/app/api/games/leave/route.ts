import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { player, gameId } = await request.json();
    await redis.srem(`game:${gameId}:players`, JSON.stringify(player));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to leave game:', error);
    return NextResponse.json(
      { error: 'Failed to leave game' },
      { status: 500 }
    );
  }
}
