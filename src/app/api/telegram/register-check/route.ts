import { redis } from '@/lib/redis';
import { sendTelegramMessage } from '@/lib/telegram';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramUserId = searchParams.get('telegramUserId');

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
      return NextResponse.json({
        isRegistered: false,
        userId: userId || null,
      });
    }

    console.log('User is registered', userId);
    return NextResponse.json({
      isRegistered: !!userId,
      userId: userId || null,
    });
  } catch (error) {
    console.error('Failed to check Telegram user:', error);
    return NextResponse.json(
      { error: 'Failed to check Telegram user' },
      { status: 500 }
    );
  }
}
