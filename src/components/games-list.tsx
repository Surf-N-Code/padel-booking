"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { format } from "date-fns"
import { Button } from "./ui/button"
import { UserPlus, UserMinus } from "lucide-react"
import type { Game } from "@/types/game"
import { Input } from "./ui/input"

export function GamesList() {
  const { data: games, isLoading, error } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      const res = await fetch("/api/games")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch games')
      }
      const data = await res.json()
      console.log('Fetched games:', data) // Debug log
      return data
    },
  })

  if (isLoading) return <div>Loading games...</div>
  if (error) return <div>Error loading games: {error.message}</div>
  if (!games?.length) return <div>No games scheduled yet.</div>

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <Card key={game.id}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{format(new Date(game.dateTime), "PPP")}</span>
              <span className="text-sm font-normal">
                {format(new Date(game.dateTime), "HH:mm")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  Players ({game.players?.length || 0}/4):
                </h3>
                <ul className="space-y-1">
                  {game.players?.map((player) => (
                    <li key={player.id} className="flex items-center justify-between">
                      <span>{player.name}</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {Array.from({ length: 4 - (game.players?.length || 0) }).map((_, index) => (
                    <li key={`empty-${index}`} className="flex gap-2">
                      <Input 
                        placeholder={`Player ${(game.players?.length || 0) + index + 1}`}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {(!game.players || game.players.length < 4) && (
                    <li className="mt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        size="sm"
                        onClick={() => handleSavePlayers(game.id)}
                      >
                        Save Players
                      </Button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 