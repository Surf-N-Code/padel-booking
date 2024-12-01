import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
// import { Resend } from 'resend';

// const resend = new Resend(process.env.RESEND_API_KEY);

// async function sendNotifications(gameId: string, newPlayer: any) {
//   const gameData = await redis.get(`game:${gameId}`);
//   if (!gameData) return;

//   const game = JSON.parse(gameData);
//   const players = await redis.smembers(`game:${gameId}:players`);
//   const allPlayers = players.map((p) => JSON.parse(p));

//   // Get all email addresses including creator
//   const emails = [game.creatorEmail, ...allPlayers.map((p) => p.email)];
//   const uniqueEmails = [...new Set(emails)];

//   // Send emails
//   await Promise.all(
//     uniqueEmails.map((email) =>
//       resend.emails.send({
//         from: 'Padel Booking <noreply@your-domain.com>',
//         to: email,
//         subject: `New Player Joined Game on ${new Date(game.date).toLocaleDateString()}`,
//         html: `
//           <p>Hi there!</p>
//           <p>${newPlayer.name} has joined the game at ${game.location} on ${new Date(game.date).toLocaleString()}.</p>
//           <p>Current players:</p>
//           <ul>
//             ${allPlayers.map((p) => `<li>${p.name}</li>`).join('')}
//           </ul>
//         `,
//       })
//     )
//   );
// }

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { player } = await request.json();
    const playerCount = await redis.scard(`game:${params.id}:players`);

    if (playerCount >= 4) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    await redis.sadd(`game:${params.id}:players`, JSON.stringify(player));

    // Send notifications
    // await sendNotifications(params.id, player);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to join game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
