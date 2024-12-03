import { Game, Player } from '@/types/game';
import { format } from 'date-fns';
import { redis } from './redis';
import { User } from '@/types/auth';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: { text: string; url: string }
) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram credentials not configured');
    return;
  }
  console.log('Sending Telegram message:', {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
    ...(replyMarkup && {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: replyMarkup.text,
              url: replyMarkup.url,
            },
          ],
        ],
      },
    }),
  });
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
          ...(replyMarkup && {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: replyMarkup.text,
                    url: replyMarkup.url,
                  },
                ],
              ],
            },
          }),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

export function formatGameForTelegram(game: Game): string {
  const date = format(new Date(game.dateTime), 'PPP');
  const time = format(new Date(game.dateTime), 'HH:mm');
  const availableSpots = 4 - (game.players?.length || 0);
  const joinUrl = `${process.env.APP_URL}?id=${game.id}`;
  console.log('Formatting game for Telegram:', game);
  const venueName = game?.venue?.label;

  return `
🎾 New Padel Game

📅 Date: ${date}
⏰ Time: ${time}
📍 Venue: ${venueName}
🎮 Level: ${game.level}
👥 Available spots: ${availableSpots}/4

Players:
${game.players?.map((p, i) => `${['1️⃣', '2️⃣', '3️⃣', '4️⃣'][i]} ${p.name}`).join('\n')}`;
}

export function formatUpcomingGameForTelegram(game: Game): string {
  const date = format(new Date(game.dateTime), 'PPP');
  const time = format(new Date(game.dateTime), 'HH:mm');
  const availableSpots = 4 - (game.players?.length || 0);
  const venueName = game.venue.label;
  const joinUrl = `${process.env.APP_URL}?id=${game.id}`;

  return `<a href="${joinUrl}">${date} - ${time} | ${venueName} | ${game.level} | ${availableSpots}/4</a>`;
}

export function formatPlayerJoinedMessage(game: Game, player: Player): string {
  const date = format(new Date(game.dateTime), 'PPP');
  const time = format(new Date(game.dateTime), 'HH:mm');
  const availableSpots = 4 - (game.players?.length || 0);
  const gameUrl = `${process.env.APP_URL}/games/${game.id}`;

  const venueName = game?.venue.label;
  return `
👋 New Player Joined!

${player.name} joined the game on ${date} at ${time}

📍 Venue: ${venueName}
👥 Available spots: ${availableSpots}/4

Current players:
${game.players?.map((p) => `• ${p.name}`).join('\n')}`;
}

export async function getUpcomingGamesForTelegramUser(telegramUserId: string) {
  // Get user by Telegram ID
  const userId = await redis.get(`telegram:${telegramUserId}`);
  if (!userId) {
    return {
      success: false,
      error: 'not_registered',
      message: `Please [register](${process.env.APP_URL}/register?telegramUserId=${telegramUserId}) to see upcoming games`,
    };
  }

  // Get user email from userId
  const userEmail = await redis.get(`userid:${userId}`);
  if (!userEmail) {
    return {
      success: false,
      error: 'user_not_found',
      message: 'User email not found',
    };
  }

  // Get user profile
  const userJson = await redis.get(`user:${userEmail}`);
  if (!userJson) {
    return {
      success: false,
      error: 'profile_not_found',
      message: 'User profile not found',
    };
  }

  const user = JSON.parse(userJson) as User;
  const favoriteVenues = user.favoriteVenues || [];

  if (favoriteVenues.length === 0) {
    return {
      success: false,
      error: 'no_favorites',
      message:
        'You have no favorite venues. Please visit your [profile settings](${process.env.APP_URL}/profile) to select your favorite padel locations.',
    };
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

  // Filter games based on criteria
  const relevantGames = games.filter((game) => {
    const isCreator = game.creatorEmail === userEmail;
    const isPlayer = game.players.some((p) => p.userId === userId);
    const hasOpenSlots = game.players.length < 4;
    const isVenueFavorite = favoriteVenues?.includes(game.venue.id);
    return (isCreator || isPlayer || isVenueFavorite) && hasOpenSlots;
  });

  return {
    success: true,
    games: relevantGames,
    gamesFound: relevantGames.length,
    message: `Found ${relevantGames.length} upcoming games for your favorite venues.`,
  };
}
