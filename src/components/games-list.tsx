'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { UserPlus, UserMinus, MapPin } from 'lucide-react';
import type { Game, Player, Venue } from '@/types/game';
import { useState, useEffect } from 'react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { LEVEL_BADGES } from '@/lib/const';
import { useSession } from 'next-auth/react';

type LoadingState = {
  gameId: string;
  type: 'join' | 'leave';
  playerId?: string;
};

const sortPlayers = (players: Player[] = []) => {
  return [...players].sort((a, b) => a.name.localeCompare(b.name));
};

export function GamesList() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [open, setOpen] = useState(false);

  // Fetch user profile when component mounts
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!session?.user) return null;
      const res = await fetch('/api/user/profile');
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
    enabled: !!session?.user,
  });

  // Pre-populate name field when joining a new game
  const getDefaultPlayerName = (gameId: string) => {
    return playerNames[gameId] || userProfile?.name || '';
  };

  const {
    data: games = [],
    isLoading,
    error,
  } = useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: async () => {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error('Failed to fetch games');
      return res.json();
    },
  });

  // Get unique venues from games
  const uniqueVenues = Array.from(
    new Set(games.map((game) => game.venue))
  ).sort((a: Venue, b: Venue) => a.label.localeCompare(b.label));

  // Filter games based on availability and selected venue
  const filteredGames = games.filter(
    (game) =>
      (!showAvailableOnly || (game.players?.length || 0) < 4) &&
      (!selectedVenue || game.venue.label === selectedVenue)
  );

  const joinGame = useMutation({
    mutationFn: async ({
      gameId,
      playerName,
    }: {
      gameId: string;
      playerName: string;
    }) => {
      setLoadingState({ gameId, type: 'join' });
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: {
            id: crypto.randomUUID(),
            name: playerName || 'Anonymous Player',
            userId: 'temp-user-id',
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to join game');
      return response.json();
    },
    onMutate: async ({ gameId, playerName }) => {
      await queryClient.cancelQueries({ queryKey: ['games'] });
      const previousGames = queryClient.getQueryData<Game[]>(['games']);

      setPlayerNames((prev) => ({
        ...prev,
        [gameId as string]: '',
      }));

      queryClient.setQueryData<Game[]>(['games'], (old) =>
        old?.map((game) => {
          if (game.id === gameId) {
            const newPlayers = sortPlayers([
              ...(game.players || []),
              {
                id: 'temp-' + crypto.randomUUID(),
                name: playerName || 'Anonymous Player',
                userId: 'temp-user-id',
              },
            ]);
            return {
              ...game,
              players: newPlayers,
            };
          }
          return game;
        })
      );

      return { previousGames, previousPlayerName: playerName, gameId };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['games'], context?.previousGames);
      // Restore input value on error
      if (context?.gameId && context.previousPlayerName) {
        setPlayerNames((prev) => ({
          ...prev,
          [context.gameId]: context.previousPlayerName,
        }));
      }
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      setPlayerNames((prev) => ({
        ...prev,
        [gameId]: '',
      }));
    },
    onSettled: () => {
      setLoadingState(null);
    },
  });

  const leaveGame = useMutation({
    mutationFn: async ({
      gameId,
      player,
    }: {
      gameId: string;
      player: Player;
    }) => {
      setLoadingState({ gameId, playerId: player.id, type: 'leave' });
      const response = await fetch(`/api/games/${gameId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player }),
      });
      if (!response.ok) throw new Error('Failed to leave game');
      return response.json();
    },
    onMutate: async ({ gameId, player }) => {
      await queryClient.cancelQueries({ queryKey: ['games'] });
      const previousGames = queryClient.getQueryData<Game[]>(['games']);

      queryClient.setQueryData<Game[]>(['games'], (old) =>
        old?.map((game) => {
          if (game.id === gameId) {
            return {
              ...game,
              players: (game.players || []).filter((p) => p.id !== player.id),
            };
          }
          return game;
        })
      );

      return { previousGames };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['games'], context?.previousGames);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
    onSettled: () => {
      setLoadingState(null);
    },
  });

  const handleSavePlayers = async (gameId: string) => {
    try {
      await joinGame.mutate({
        gameId,
        playerName: playerNames[gameId],
      });
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  const handleRemovePlayer = async (gameId: string, player: Player) => {
    try {
      await leaveGame.mutate({ gameId, player });
    } catch (error) {
      console.error('Failed to remove player:', error);
    }
  };

  const isButtonLoading = (
    gameId: string,
    type: 'join' | 'leave',
    playerId?: string
  ) => {
    return (
      loadingState?.gameId === gameId &&
      loadingState.type === type &&
      (type === 'join' || loadingState.playerId === playerId)
    );
  };

  if (isLoading)
    return (
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="mt-6 h-[320px] w-[330px] rounded-xl" />
          <Skeleton className="mt-6 h-[320px] w-[330px] rounded-xl" />
          <Skeleton className="mt-6 h-[320px] w-[330px] rounded-xl" />
        </div>
      </div>
    );
  if (error) return <div>Error loading games: {error.message}</div>;
  if (!games?.length) return <div>No games scheduled yet.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="available-games"
            checked={showAvailableOnly}
            onCheckedChange={setShowAvailableOnly}
          />
          <Label htmlFor="available-games">
            Show only games with available spots
          </Label>
        </div>

        <div className="w-[300px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between truncate"
              >
                <span className="truncate">
                  {selectedVenue
                    ? uniqueVenues.find(
                        (venue) => venue.label === selectedVenue
                      )?.label
                    : 'Filter by venue'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search venue..." />
                <CommandList>
                  {' '}
                  <CommandEmpty>No venue found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedVenue('');
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          !selectedVenue ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      All venues
                    </CommandItem>
                    {uniqueVenues.map((venue) => (
                      <CommandItem
                        key={venue.id}
                        onSelect={() => {
                          setSelectedVenue(venue.label);
                          setOpen(false);
                        }}
                        className="truncate"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedVenue === venue.label
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{venue.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGames.map((game) => (
          <Card key={game.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <span>{format(new Date(game.dateTime), 'PPP')}</span>
                    <Badge
                      variant={LEVEL_BADGES[game.level]?.variant || 'default'}
                    >
                      {LEVEL_BADGES[game.level]?.label || game.level}
                    </Badge>
                  </CardTitle>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      {format(new Date(game.dateTime), 'HH:mm')}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {game.venue.label}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">
                    Players ({game.players?.length || 0}/4):
                  </h3>
                  <ul className="space-y-1">
                    {sortPlayers(game.players)?.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between"
                      >
                        <span>{player.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemovePlayer(game.id, player)}
                          disabled={isButtonLoading(
                            game.id,
                            'leave',
                            player.id
                          )}
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
                            value={getDefaultPlayerName(game.id)}
                            onChange={(e) =>
                              setPlayerNames((prev) => ({
                                ...prev,
                                [game.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Enter' &&
                                getDefaultPlayerName(game.id)
                              ) {
                                e.preventDefault();
                                handleSavePlayers(game.id);
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSavePlayers(game.id)}
                            disabled={isButtonLoading(game.id, 'join')}
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
    </div>
  );
}
