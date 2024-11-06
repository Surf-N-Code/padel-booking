"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { format } from "date-fns"
import { Button } from "./ui/button"
import { UserPlus, UserMinus } from "lucide-react"

export function GamesList() {
  const { data: games } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const res = await fetch("/api/games")
      return res.json()
    },
  })

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {games?.map((game: any) => (
        <Card key={game.id}>
          <CardHeader>
            <CardTitle>
              {format(new Date(game.dateTime), "PPP p")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold">Players ({game.players.length}/4):</h3>
                <ul className="list-disc list-inside">
                  {game.players.map((player: any) => (
                    <li key={player.id}>{player.name}</li>
                  ))}
                </ul>
              </div>
              {game.players.length < 4 && (
                <Button className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Game
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 