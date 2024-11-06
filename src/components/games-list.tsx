"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { format } from "date-fns"
import { Button } from "./ui/button"
import { UserPlus, UserMinus } from "lucide-react"
import type { Game, Player } from "@/types/game"
import { useState } from "react"

type LoadingState = {
  gameId: string;
  playerId?: string;
  type: 'join' | 'leave';
}

export function GamesList() {
  const queryClient = useQueryClient()
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({})
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null)

  const { data: games, isLoading, error } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      const res = await fetch("/api/games")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch games')
      }
      return res.json()
    },
  })

  const joinGame = useMutation({
    mutationFn: async (gameId: string) => {
      setLoadingState({ gameId, type: 'join' })
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player: {
            id: crypto.randomUUID(),
            name: playerNames[gameId] || 'Anonymous Player',
            userId: 'temp-user-id'
          }
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to join game')
      }
      return response.json()
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      setPlayerNames(prev => ({
        ...prev,
        [gameId]: ''
      }))
    },
    onSettled: () => {
      setLoadingState(null)
    }
  })

  const leaveGame = useMutation({
    mutationFn: async ({ gameId, player }: { gameId: string; player: Player }) => {
      setLoadingState({ gameId, playerId: player.id, type: 'leave' })
      const response = await fetch(`/api/games/${gameId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player }),
      })
      if (!response.ok) {
        throw new Error('Failed to leave game')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
    onSettled: () => {
      setLoadingState(null)
    }
  })

  const handleSavePlayers = async (gameId: string) => {
    try {
      await joinGame.mutate(gameId)
    } catch (error) {
      console.error('Failed to join game:', error)
    }
  }

  const handleRemovePlayer = async (gameId: string, player: Player) => {
    try {
      await leaveGame.mutate({ gameId, player })
    } catch (error) {
      console.error('Failed to remove player:', error)
    }
  }

  const isButtonLoading = (gameId: string, playerId?: string, type: 'join' | 'leave') => {
    return loadingState?.gameId === gameId && 
           loadingState.type === type && 
           (type === 'join' || loadingState.playerId === playerId)
  }

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
                    <li 
                      key={player.id}
                      className="flex items-center justify-between"
                    >
                      <span>{player.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemovePlayer(game.id, player)}
                        disabled={isButtonLoading(game.id, player.id, 'leave')}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {(!game.players || game.players.length < 4) && (
                    <li className="mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Your name"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={playerNames[game.id] || ''}
                          onChange={(e) => setPlayerNames(prev => ({
                            ...prev,
                            [game.id]: e.target.value
                          }))}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSavePlayers(game.id)}
                          disabled={isButtonLoading(game.id, undefined, 'join')}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
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