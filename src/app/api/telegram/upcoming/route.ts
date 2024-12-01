import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  formatGameForTelegram,
  formatUpcomingGameForTelegram,
  sendTelegramMessage,
} from '@/lib/telegram';
import { Game } from '@/types/game';

export async function GET() {
  try {
    // Get current timestamp
    const now = Date.now();

    // Get upcoming games from sorted set
    const gameIds = await redis.zrangebyscore('games:by:date', now, '+inf');

    // Get game details and players
    const games = await Promise.all(
      gameIds.map(async (id) => {
        const gameData = await redis.hgetall(`game:${id}`);
        const players = await redis.smembers(`game:${id}:players`);
        return {
          ...gameData,
          players: players.map((p) => JSON.parse(p)),
        };
      })
    );

    // Filter games with open slots
    const gamesWithOpenSlots = games.filter(
      (game) => (game.players?.length || 0) < 4
    );

    // Format message for Telegram
    if (gamesWithOpenSlots.length > 0) {
      const message = `
🎾 <b>Upcoming Games with Open Slots</b>

${gamesWithOpenSlots
  .map((game) => formatUpcomingGameForTelegram(game as Game))
  .join('\n\n')}
`;

      await sendTelegramMessage(message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'No upcoming games with open slots' });
  } catch (error) {
    console.error('Failed to list upcoming games:', error);
    return NextResponse.json(
      { error: 'Failed to list upcoming games' },
      { status: 500 }
    );
  }
}
