'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { UserPlus, UserMinus, MapPin, Star, Loader2 } from 'lucide-react';
import type { Game, Player, Venue } from '@/types/game';
import { useState, useEffect, useMemo } from 'react';
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
import { useRouter } from 'next/navigation';

type LoadingState = {
  gameId: string;
  type: 'join' | 'leave';
  playerId?: string;
};

interface GamesListProps {
  gameId?: string;
}

const sortPlayers = (players: Player[] = []) => {
  return [...players].sort((a, b) => a.name.localeCompare(b.name));
};

export function GamesList({ gameId }: GamesListProps) {
  const router = useRouter();
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
    return playerNames[gameId] !== undefined
      ? playerNames[gameId]
      : userProfile?.name || '';
  };

  // Initialize playerNames with profile name when profile is loaded
  useEffect(() => {
    if (userProfile?.name && Object.keys(playerNames).length === 0) {
      setPlayerNames({});
    }
  }, [userProfile]);

  const {
    data: games = [],
    isLoading,
    error,
  } = useQuery<Game[]>({
    queryKey: ['games', gameId],
    queryFn: async () => {
      const url = gameId ? `/api/games?id=${gameId}` : '/api/games';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch games');
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    },
  });

  // Get unique venues from games
  const uniqueVenues = Array.from(
    new Set(games.map((game) => game.venue))
  ).sort((a: Venue, b: Venue) => a.label.localeCompare(b.label));

  // Sort venues with favorites at top
  const sortedVenues = useMemo(() => {
    if (!uniqueVenues || !userProfile?.favoriteVenues) return uniqueVenues;

    return [...uniqueVenues].sort((a, b) => {
      const aIsFavorite = userProfile.favoriteVenues.includes(a.id);
      const bIsFavorite = userProfile.favoriteVenues.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [uniqueVenues, userProfile?.favoriteVenues]);

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
      playerLastName,
    }: {
      gameId: string;
      playerName: string;
      playerLastName: string;
    }) => {
      console.log('Joining game', gameId, playerName, playerLastName);
      setLoadingState({ gameId, type: 'join' });
      const response = await fetch(`/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          player: {
            id: crypto.randomUUID(),
            name: playerName,
            lastName: playerLastName,
            userId: session?.user?.id || 'anonymous-user-id',
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to join game');
      return response.json();
    },
    onMutate: async ({ gameId, playerName, playerLastName }) => {
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
                lastName: playerLastName,
                userId: session?.user?.id || 'anonymous-user-id',
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

      return {
        previousGames,
        previousPlayerName: playerName,
        playerLastName,
        gameId,
      };
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      console.log('Success', variables);
      setPlayerNames((prev) => ({
        ...prev,
        [variables.gameId]: '',
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
      const response = await fetch(`/api/games/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, player }),
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
        playerName: getDefaultPlayerName(gameId),
        playerLastName: userProfile?.lastName,
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

  const handleAddPlayer = (gameId: string) => {
    if (!session?.user) {
      router.push('/login');
      return;
    }
    handleSavePlayers(gameId);
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
      {!gameId && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-available"
              checked={showAvailableOnly}
              onCheckedChange={setShowAvailableOnly}
            />
            <Label htmlFor="show-available">Show available only</Label>
          </div>

          <div className="flex-1">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between w-[250px]"
                >
                  {selectedVenue || 'Filter by venue'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search venue..." />
                  <CommandList>
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
                      {sortedVenues.map((venue) => (
                        <CommandItem
                          key={venue.id}
                          onSelect={() => {
                            setSelectedVenue(venue.label);
                            setOpen(false);
                          }}
                          className="truncate"
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedVenue === venue.label
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {userProfile?.favoriteVenues?.includes(
                              venue.id
                            ) && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                            <span className="truncate">{venue.label}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                        <span>{`${player.name} ${player?.lastName ? player.lastName.slice(0, 1) + '.' : ''}`}</span>
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddPlayer(game.id)}
                            disabled={isButtonLoading(game.id, 'join')}
                          >
                            {isButtonLoading(game.id, 'join') ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Join Game
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
