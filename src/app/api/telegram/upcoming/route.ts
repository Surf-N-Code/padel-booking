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
    const telegramUserId = searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    // Get user by Telegram ID
    const userId = await redis.get(`telegram:${telegramUserId}`);
    if (!userId) {
      await sendTelegramMessage(
        `Please [register](${process.env.APP_URL}/register?telegramUserId=${telegramUserId}) to see upcoming games`,
        'Markdown'
      );
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user email from userId
    const userEmail = await redis.get(`userid:${userId}`);
    if (!userEmail) {
      console.log('user with id: ', userId, 'not found');
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 404 }
      );
    }

    // Get user profile
    const userJson = await redis.get(`user:${userEmail}`);
    if (!userJson) {
      console.log('user with email: ', userEmail, 'not found');
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const user = JSON.parse(userJson) as User;
    const favoriteVenues = user.favoriteVenues || [];

    if (favoriteVenues.length === 0) {
      await sendTelegramMessage(
        'You have no favorite venues. Please visit your [profile settings](${process.env.APP_URL}/profile) to select your favorite padel locations.',
        'Markdown'
      );
    }

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
        } as Game;
      })
    );

    // Filter games based on criteria:
    // 1. Game is in the future (already filtered by zrangebyscore)
    // 2. User created the game OR is a player in the game
    const relevantGames = games.filter((game) => {
      const isCreator = game.creatorEmail === userEmail;
      const isPlayer = game.players.some((p) => p.userId === userId);
      const hasOpenSlots = game.players.length < 4;
      const isVenueFavorite = favoriteVenues?.includes(game.venue.id);
      return (isCreator || isPlayer || isVenueFavorite) && hasOpenSlots;
    });

    // Format message for Telegram
    if (relevantGames.length > 0) {
      const message = `
🎾 <b>Your Upcoming Games</b>

${relevantGames
  .map((game) => formatUpcomingGameForTelegram(game as Game))
  .join('\n\n')}
`;

      await sendTelegramMessage(message, 'HTML');
      return NextResponse.json({
        success: true,
        gamesFound: relevantGames.length,
      });
    } else {
      await sendTelegramMessage(
        'There are no upcoming games. Visit our website to join or create a game!',
        'HTML'
      );
    }

    return NextResponse.json({
      message: 'No upcoming games found',
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
