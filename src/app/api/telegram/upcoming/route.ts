import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  formatGameForTelegram,
  formatUpcomingGameForTelegram,
  sendTelegramMessage,
} from '@/lib/telegram';
import { Game } from '@/types/game';
import { User } from '@/types/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    // Get user by Telegram ID
    const userId = await redis.get(`telegram:${telegramId}`);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user email from userId
    const userEmail = await redis.get(`userid:${userId}`);
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 404 }
      );
    }

    // Get user profile to access favorite venues
    const userJson = await redis.get(`user:${userEmail}`);
    if (!userJson) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const user = JSON.parse(userJson) as User;
    const favoriteVenues = user.favoriteVenues || [];

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
          id,
          venue: JSON.parse(gameData.venue),
          players: players.map((p) => JSON.parse(p)),
        };
      })
    );

    // Filter games based on criteria:
    // 1. Has open slots
    // 2. Venue is in user's favorites
    // 3. Game is in the future (already filtered by zrangebyscore)
    const relevantGames = games.filter((game) => {
      const hasOpenSlots = (game.players?.length || 0) < 4;
      const isVenueFavorite = favoriteVenues.includes(game.venue.id);
      return hasOpenSlots && isVenueFavorite;
    });

    // Format message for Telegram
    if (relevantGames.length > 0) {
      const message = `
🎾 <b>Upcoming Games at Your Favorite Venues</b>

${relevantGames
  .map((game) => formatUpcomingGameForTelegram(game as Game))
  .join('\n\n')}
`;

      await sendTelegramMessage(message);
      return NextResponse.json({
        success: true,
        gamesFound: relevantGames.length,
      });
    }

    return NextResponse.json({
      message: 'No upcoming games at your favorite venues',
      gamesFound: 0,
    });
  } catch (error) {
    console.error('Failed to list upcoming games:', error);
    return NextResponse.json(
      { error: 'Failed to list upcoming games' },
      { status: 500 }
    );
  }
}
