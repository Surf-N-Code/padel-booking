import { redis } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { player } = await request.json()
  const playerCount = await redis.scard(`game:${params.id}:players`)

  if (playerCount >= 4) {
    return NextResponse.json(
      { error: "Game is full" },
      { status: 400 }
    )
  }

  await redis.sadd(`game:${params.id}:players`, JSON.stringify(player))
  return NextResponse.json({ success: true })
} 