import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const chatId = req.body.message.chat.id; // Get chat ID
    const messageText = req.body.message.text; // Get the message text

    // Process the message (e.g., log it, send a response, etc.)
    console.log(`New message from ${chatId}: ${messageText}`);

    // Optionally, send a response back to the user
    const token = process.env.TELEGRAM_BOT_TOKEN; // Your bot's API key
    // const response = await fetch(
    //   `https://api.telegram.org/bot${token}/sendMessage`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       chat_id: chatId,
    //       text: 'Hi! Your message was received.',
    //     }),
    //   }
    // );

    return res.status(200).json({ success: true });
  } else {
    return res.status(405).end(); // Method Not Allowed
  }
}
