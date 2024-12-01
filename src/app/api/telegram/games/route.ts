import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { addDays, format } from 'date-fns';
import type { Game } from '@/types/game';

export async function GET(request: Request) {
  try {
    // Extract game ID from URL if present
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const now = new Date().getTime();
    const gameIds = await redis.zrangebyscore(
      'games:by:date',
      now,
      addDays(new Date(), 60).getTime()
    );

    const games = await Promise.all(
      gameIds.map(async (id) => {
        const [gameData, dateTimeScore] = await Promise.all([
          redis.hgetall(`game:${id}`),
          redis.zscore('games:by:date', id),
        ]);
        const players = await redis.smembers(`game:${id}:players`);

        if (!dateTimeScore) throw new Error(`No date found for game ${id}`);

        const startDate = new Date(parseInt(dateTimeScore));
        const endDate = new Date(startDate.getTime() + 90 * 60000); // 90 mins later

        return {
          date: format(startDate, 'PPP'),
          startTime: format(startDate, 'HH:mm'),
          endTime: format(endDate, 'HH:mm'),
          venue: JSON.parse(gameData.venue || '{}')?.label,
          level: gameData.level,
          players: players.map((player) => JSON.parse(player).name),
        };
      })
    );

    const sortedGames = games.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json(sortedGames);
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
