import { TELEGRAM_SLASH_COMMANDS } from '@/lib/const';
import { redis } from '@/lib/redis';
import { sendTelegramMessage } from '@/lib/telegram';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const telegramUserId = body.message.chat.id; // Get chat ID
  const messageText = body.message.text; // Get the message text

  // Process the message (e.g., log it, send a response, etc.)
  console.log(`New message from ${telegramUserId}: ${messageText}`);

  if (!telegramUserId) {
    return NextResponse.json(
      { error: 'Telegram user ID is required' },
      { status: 400 }
    );
  }

  // Check if the Telegram ID exists in Redis
  const userId = await redis.get(`telegram:${telegramUserId}`);

  if (!userId) {
    await sendTelegramMessage(
      telegramUserId,
      `You are not registered for padel.baby. Please register [here](${process.env.APP_URL}/register?telegramUserId=${telegramUserId})`,
      'Markdown'
    );
  }

  if (messageText.startsWith(TELEGRAM_SLASH_COMMANDS.register)) {
    // TODO: Register user
  }

  if (messageText.startsWith(TELEGRAM_SLASH_COMMANDS.listGames)) {
    // TODO: List games
  }

  return NextResponse.json({ success: true });
}
