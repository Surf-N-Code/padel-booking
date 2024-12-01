import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { formatPlayerJoinedMessage, sendTelegramMessage } from '@/lib/telegram';
import { headers } from 'next/headers';
import { Game } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const { player, gameId } = await req.json();

    // Validate player data
    if (!player || !player.name) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    // Validate gameId
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Check if game exists and get game data
    const gameData = await redis.hgetall(`game:${gameId}`);
    if (!gameData) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get current players
    const currentPlayers = await redis.smembers(`game:${gameId}:players`);
    if (currentPlayers.length >= 4) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Add player to game
    await redis.sadd(`game:${gameId}:players`, JSON.stringify(player));

    // Send Telegram notification
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    //@ts-ignore
    const game: Game = {
      ...gameData,
      players: [...currentPlayers.map((p) => JSON.parse(p)), player],
    };

    await sendTelegramMessage(formatPlayerJoinedMessage(game, player, baseUrl));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to join game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}