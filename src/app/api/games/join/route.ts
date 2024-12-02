import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { formatPlayerJoinedMessage, sendTelegramMessage } from '@/lib/telegram';
import { Game } from '@/types/game';
import { User } from '@/types/auth';

export async function POST(req: NextRequest) {
  try {
    const { player, gameId } = await req.json();

    if (!player || !player.name) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Get game data
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

    // Prepare game object for notification
    //@ts-ignore
    const game: Game = {
      ...gameData,
      id: gameId,
      venue: JSON.parse(gameData.venue),
      players: [...currentPlayers.map((p) => JSON.parse(p)), player],
    };

    // Get creator's telegram ID
    const creatorEmail = game.creatorEmail;
    const creatorJson = await redis.get(`user:${creatorEmail}`);
    const creator = creatorJson ? (JSON.parse(creatorJson) as User) : null;

    console.log('creator', creator);
    // Notify game creator
    if (creator?.telegramId) {
      await sendTelegramMessage(
        creator.telegramId,
        formatPlayerJoinedMessage(game, player),
        'HTML',
        {
          text: 'View Game',
          url: `${process.env.APP_URL}?id=${gameId}`,
        }
      );
    }

    // Notify all other players
    await Promise.all(
      currentPlayers.map(async (playerJson) => {
        const existingPlayer = JSON.parse(playerJson);
        if (!existingPlayer.userId) return; // Skip if no userId

        const playerEmail = await redis.get(`userid:${existingPlayer.userId}`);
        if (!playerEmail) return;

        const userJson = await redis.get(`user:${playerEmail}`);
        if (!userJson) return;

        const user = JSON.parse(userJson) as User;
        if (!user.telegramId) return;

        await sendTelegramMessage(
          user.telegramId,
          formatPlayerJoinedMessage(game, player),
          'HTML',
          {
            text: 'View Game',
            url: `${process.env.APP_URL}?id=${gameId}`,
          }
        );
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to join game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
