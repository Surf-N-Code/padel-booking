import { Game, Player } from '@/types/game';
import { format } from 'date-fns';

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
  console.log('Reply markup:', replyMarkup);
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
