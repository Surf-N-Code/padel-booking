import { TELEGRAM_SLASH_COMMANDS } from '@/lib/const';
import { redis } from '@/lib/redis';
import {
  formatUpcomingGameForTelegram,
  getUpcomingGamesForTelegramUser,
  sendTelegramMessage,
} from '@/lib/telegram';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const telegramUserId = body.message.chat.id;
  const messageText = body.message.text;

  console.log(`New message from ${telegramUserId}: ${messageText}`);

  if (!telegramUserId) {
    return NextResponse.json(
      { error: 'Telegram user ID is required' },
      { status: 400 }
    );
  }

  // Check if the Telegram ID exists in Redis
  const userId = await redis.get(`telegram:${telegramUserId}`);

  console.log(
    'User ID',
    userId,
    messageText.startsWith(TELEGRAM_SLASH_COMMANDS.register)
  );

  if (messageText.startsWith(TELEGRAM_SLASH_COMMANDS.start)) {
    let msg = `Hi, there. This Telegram bot is used to find and join padel games in your favourite venues.
    
    - It will also notify you when a new game is created in your favourite venues.
    - It will also notify you when a player joins one of your created game(s).
    - You can register for a game by sending the /register command or by using the blue menu button below this message.
    - You can list upcoming games by sending the /listgames command or by using the blue menu button below this message.`;
    await sendTelegramMessage(telegramUserId, msg, 'Markdown');
    return NextResponse.json({ success: true });
  }

  let msg = `You are not registered for padel.baby. Please register [here](${process.env.APP_URL}/register?telegramUserId=${telegramUserId})`;
  console.log('User ID', userId);
  if (
    userId &&
    !messageText.startsWith(TELEGRAM_SLASH_COMMANDS.register) &&
    !messageText.startsWith(TELEGRAM_SLASH_COMMANDS.listGames)
  ) {
    msg = `Hi, please use the blue menu button below this message to control the bot

👇`;
    await sendTelegramMessage(telegramUserId, msg, 'Markdown');
    return NextResponse.json({ success: true });
  }

  if (userId && messageText.startsWith(TELEGRAM_SLASH_COMMANDS.register)) {
    msg = `You are already registered for padel.baby. Visit the [website](${process.env.APP_URL}) to see upcoming games.`;
    await sendTelegramMessage(telegramUserId, msg, 'Markdown');
    return NextResponse.json({ success: true });
  }

  if (!userId && !messageText.startsWith(TELEGRAM_SLASH_COMMANDS.register)) {
    await sendTelegramMessage(telegramUserId, msg, 'Markdown');
    return NextResponse.json({ success: true });
  }

  if (messageText.startsWith(TELEGRAM_SLASH_COMMANDS.register)) {
    if (!userId) {
      await sendTelegramMessage(telegramUserId, msg, 'Markdown');
    } else {
      msg = `You are already registered for padel.baby. Visit the [website](${process.env.APP_URL}) to see upcoming games.`;
      await sendTelegramMessage(telegramUserId, msg, 'Markdown');
    }
    return NextResponse.json({ success: true });
  }

  if (messageText.startsWith(TELEGRAM_SLASH_COMMANDS.listGames)) {
    const result = await getUpcomingGamesForTelegramUser(
      telegramUserId.toString()
    );

    if (!result.success) {
      await sendTelegramMessage(telegramUserId, result.message, 'Markdown');
      return NextResponse.json({ success: true });
    }

    if (result.gamesFound === 0) {
      await sendTelegramMessage(
        telegramUserId,
        'No upcoming games found for your favorite venues. Visit our website to join or create a game or subscribe to more venues!',
        'HTML'
      );
      return NextResponse.json({ success: true });
    }

    // Format message for Telegram
    const message = `
🎾 <b>Upcoming games in your favourite venues</b>

${result?.games?.map((game) => formatUpcomingGameForTelegram(game)).join('\n\n')}
`;

    await sendTelegramMessage(telegramUserId, message, 'HTML');
  }

  return NextResponse.json({ success: true });
}
