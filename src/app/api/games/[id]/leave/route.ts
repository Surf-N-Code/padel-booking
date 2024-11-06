import { redis } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { player } = await request.json()
    await redis.srem(
      `game:${params.id}:players`, 
      JSON.stringify(player)
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to leave game:', error)
    return NextResponse.json(
      { error: 'Failed to leave game' },
      { status: 500 }
    )
  }
} 