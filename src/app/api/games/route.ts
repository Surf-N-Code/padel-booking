import { redis } from "@/lib/redis"
import { NextResponse } from "next/server"
import { addDays } from "date-fns"
import { Game } from "@/types/game"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const id = crypto.randomUUID()
    
    const game: Partial<Game> = {
      id,
      dateTime: data.dateTime,
      location: data.location || "Main Court",
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || "anonymous", // Replace when auth is added
    }

    // Store game data in hash
    await redis.hset(`game:${id}`, game)

    // Add to sorted set for date-based queries
    await redis.zadd('games', Date.parse(game.dateTime), game.id)

    // Add initial players if any
    if (data.players?.length) {
      await redis.sadd(
        `game:${id}:players`,
        data.players.map((p: any) => JSON.stringify(p))
      )
    }

    return NextResponse.json({ id, ...game })
  } catch (error) {
    console.error('Failed to create game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get all game IDs from the sorted set for next 2 weeks
    const gameIds = await redis.zrangebyscore(
      "games:by:date",
      new Date().getTime(),
      addDays(new Date(), 14).getTime()
    )

    // Get game details for each ID
    const games = await Promise.all(
      gameIds.map(async (id) => {
        const game = await redis.hgetall(`game:${id}`)
        const players = await redis.smembers(`game:${id}:players`)
        return {
          ...game,
          id,
          players: players.map(player => JSON.parse(player))
        }
      })
    )

    return NextResponse.json(games)
  } catch (error) {
    console.error('Failed to fetch games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
} 