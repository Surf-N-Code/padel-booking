import { NextResponse } from 'next/server';
import {
  formatUpcomingGameForTelegram,
  getUpcomingGamesForTelegramUser,
  sendTelegramMessage,
} from '@/lib/telegram';

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

    const result = await getUpcomingGamesForTelegramUser(telegramUserId);

    if (!result.success) {
      await sendTelegramMessage(telegramUserId, result.message, 'Markdown');
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    if (result.gamesFound === 0) {
      await sendTelegramMessage(
        telegramUserId,
        'No upcoming games found for your favorite venues. Visit our website to join or create a game or subscribe to more venues!',
        'HTML'
      );
      return NextResponse.json({
        message: 'No upcoming games found',
        gamesFound: 0,
      });
    }

    if (!result.games) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    // Format message for Telegram
    const message = `
🎾 <b>Your Upcoming Games</b>

${result.games.map((game) => formatUpcomingGameForTelegram(game)).join('\n\n')}
`;

    await sendTelegramMessage(telegramUserId, message, 'HTML');
    return NextResponse.json({
      success: true,
      gamesFound: result.gamesFound,
    });
  } catch (error) {
    console.error('Failed to list upcoming games:', error);
    return NextResponse.json(
      { error: 'Failed to list upcoming games' },
      { status: 500 }
    );
  }
}
