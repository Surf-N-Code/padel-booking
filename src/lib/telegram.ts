import { Game, Player } from '@/types/game';
import { format } from 'date-fns';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram credentials not configured');
    return;
  }
  console.log('Sending Telegram message:', {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
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
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    console.log('Telegram response:', response);

    if (!response.ok) {
      throw new Error('Failed to send Telegram message');
    }

    return response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

export function formatGameForTelegram(game: Game, baseUrl: string): string {
  const date = format(new Date(game.dateTime), 'PPP');
  const time = format(new Date(game.dateTime), 'HH:mm');
  const availableSpots = 4 - (game.players?.length || 0);
  const joinUrl = `${baseUrl}/games/${game.id}`;

  return `
🎾 <b>New Padel Game</b>

📅 Date: ${date}
⏰ Time: ${time}
📍 Venue: ${game.venue.label}
🎮 Level: ${game.level}
👥 Available spots: ${availableSpots}/4

Players:
${game.players?.map((p, i) => `${['1️⃣', '2️⃣', '3️⃣', '4️⃣'][i]} ${p.name}`).join('\n')}

<a href="${joinUrl}">Join Game</a>
`;
}

export function formatPlayerJoinedMessage(
  game: Game,
  player: Player,
  baseUrl: string
): string {
  const date = format(new Date(game.dateTime), 'PPP');
  const time = format(new Date(game.dateTime), 'HH:mm');
  const availableSpots = 4 - (game.players?.length || 0);
  const gameUrl = `${baseUrl}/games/${game.id}`;

  const venueName = JSON.parse(game?.venue.toString()).label;
  console.log('Formatting player joined message:', game, venueName);
  return `
----------------------------
👋 <b>New Player Joined!</b>

${player.name} joined the game on ${date} at ${time}

📍 Venue: ${venueName}
👥 Available spots: ${availableSpots}/4

Current players:
${game.players?.map((p) => `• ${p.name}`).join('\n')}

<a href="${gameUrl}">View Game</a>
`;
}
