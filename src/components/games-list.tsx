'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { UserPlus, UserMinus, MapPin, Star, Loader2 } from 'lucide-react';
import type { Game, Player, Venue } from '@/types/game';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 8;

  // Fetch user profile to get favorite venues
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!session?.user) return null;
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session?.user,
  });

  // Get games with favorite venues filter
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games', gameId],
    queryFn: async () => {
      const response = await fetch(
        gameId ? `/api/games?id=${gameId}` : '/api/games'
      );
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    },
  });

  // Get unique venues from games that are in user's favorites
  const venues = useMemo(() => {
    if (!userProfile?.favoriteVenues) return null;

    const gameVenues = games.map((game) => game.venue);
    const uniqueVenues = [
      ...new Map(gameVenues.map((v) => [v.id, v])).values(),
    ];
    return uniqueVenues.filter((venue) =>
      userProfile.favoriteVenues.includes(venue.id)
    );
  }, [games, userProfile?.favoriteVenues]);

  // Filter games based on availability, selected venue, and favorite venues
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const availabilityMatch = !showAvailableOnly || game.players.length < 4;
      const venueMatch = !selectedVenue || game.venue.label === selectedVenue;
      const isFavoriteVenue = userProfile?.favoriteVenues?.includes(
        game.venue.id
      );
      return availabilityMatch && venueMatch && isFavoriteVenue;
    });
  }, [games, showAvailableOnly, selectedVenue, userProfile?.favoriteVenues]);

  // Calculate pagination
  const totalGames = filteredGames.length;
  const totalPages = Math.ceil(totalGames / gamesPerPage);
  const startIndex = (currentPage - 1) * gamesPerPage;
  const endIndex = startIndex + gamesPerPage;
  const currentGames = filteredGames.slice(startIndex, endIndex);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

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

  // Pre-populate name field when joining a new game
  const getDefaultPlayerName = (gameId: string) => {
    return playerNames[gameId] !== undefined
      ? playerNames[gameId]
      : userProfile?.name || '';
  };

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
    if (!session?.user) {
      router.push('/login');
      return;
    }
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

  // Check if current user is already a player in the game
  const isUserInGame = useCallback(
    (game: Game) => {
      if (!session?.user) return false;
      return game.players.some((player) => player.userId === session.user.id);
    },
    [session?.user]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-3">
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 justify-between">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="mt-6 h-[250px] w-full md:w-[376px] lg:w-[238px] rounded-xl" />
          <Skeleton className="mt-6 h-[250px] w-full md:w-[376px] lg:w-[238px] rounded-xl" />
          <Skeleton className="mt-6 h-[250px] w-full md:w-[376px] lg:w-[238px] rounded-xl" />
          <Skeleton className="mt-6 h-[250px] w-full md:w-[376px] lg:w-[238px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!games?.length) return <div>No games scheduled yet.</div>;
  if (!filteredGames.length)
    return <div>No games found in your favorite venues.</div>;

  return (
    <div className="space-y-6">
      {!gameId && (
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-available"
              checked={showAvailableOnly}
              onCheckedChange={setShowAvailableOnly}
            />
            <Label htmlFor="show-available">Show available only</Label>
          </div>

          {venues && venues.length > 0 && (
            <div className="flex">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
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
                            setCurrentPage(1);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              !selectedVenue ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          All favorite venues
                        </CommandItem>
                        {venues.map((venue) => (
                          <CommandItem
                            key={venue.id}
                            onSelect={() => {
                              setSelectedVenue(venue.label);
                              setCurrentPage(1);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedVenue === venue.label
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {venue.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {currentGames.map((game) => (
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
                        {player.userId === session?.user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePlayer(game.id, player)}
                            disabled={isButtonLoading(game.id, 'leave')}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                    {(!game.players || game.players.length < 4) && (
                      <li className="mt-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleAddPlayer(game.id)}
                          disabled={
                            isButtonLoading(game.id, 'join') ||
                            isUserInGame(game)
                          }
                        >
                          {isButtonLoading(game.id, 'join') ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : isUserInGame(game) ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Already Joined
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Join Game
                            </>
                          )}
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

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                isActive={currentPage > 1}
              />
            </PaginationItem>

            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => setCurrentPage(page as number)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                isActive={currentPage !== totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
