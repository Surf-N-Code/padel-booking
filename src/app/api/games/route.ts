import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { formatGameForTelegram, sendTelegramMessage } from '@/lib/telegram';
import { headers } from 'next/headers';
import { addDays } from 'date-fns';
import { Game } from '@/types/game';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();

    const game = {
      id,
      dateTime: data.dateTime,
      level: data.level,
      venue: JSON.stringify(data.venue),
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || 'anonymous',
    };

    // Store game data in hash
    await redis.hset(`game:${id}`, game);

    // Add to sorted set for date-based queries
    await redis.zadd('games:by:date', Date.parse(game.dateTime), game.id);

    // Add initial players if any
    if (data.players?.length) {
      await redis.sadd(
        `game:${id}:players`,
        data.players.map((p: any) => JSON.stringify(p))
      );
    }

    // Send Telegram notification
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    await sendTelegramMessage(
      formatGameForTelegram(
        {
          ...game,
          venue: JSON.parse(game.venue),
          players: data.players || [],
          location: JSON.parse(game.venue).addressLines,
        },
        baseUrl
      )
    );

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Failed to create game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all game IDs from the sorted set for future games only
    const now = new Date().getTime();
    const gameIds = await redis.zrangebyscore(
      'games:by:date',
      now,
      addDays(new Date(), 60).getTime()
    );

    console.log('Found game IDs:', gameIds);

    // Get game details and scores for each ID
    const games = await Promise.all(
      gameIds.map(async (id) => {
        const [gameData, dateTimeScore] = await Promise.all([
          redis.hgetall(`game:${id}`),
          redis.zscore('games:by:date', id),
        ]);
        const players = await redis.smembers(`game:${id}:players`);

        if (!dateTimeScore) throw new Error(`No date found for game ${id}`);

        return {
          ...gameData,
          venue: JSON.parse(gameData.venue || '{}'),
          id,
          dateTime: new Date(parseInt(dateTimeScore)).toISOString(),
          players: players.map((player) => JSON.parse(player)),
        } as Game;
      })
    );

    // Sort games by date
    const sortedGames = games.sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    console.log('Final games data:', sortedGames);
    return NextResponse.json(sortedGames);
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
