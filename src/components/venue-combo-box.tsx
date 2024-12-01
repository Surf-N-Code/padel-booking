'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Venue } from '@/types/game';
import { formSchema } from '@/formSchema/newGame';
import { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

interface VenueComboboxProps {
  form: UseFormReturn<z.infer<typeof formSchema>>;
  venues: Venue[] | undefined;
  isLoading: boolean;
}

export function VenueCombobox({ form, venues, isLoading }: VenueComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { data: session } = useSession();

  // Fetch user profile
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

  // Sort venues with favorites at top
  const sortedVenues = useMemo(() => {
    if (!venues || !userProfile?.favoriteVenues) return venues;

    return [...venues].sort((a, b) => {
      const aIsFavorite = userProfile.favoriteVenues.includes(a.id);
      const bIsFavorite = userProfile.favoriteVenues.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [venues, userProfile?.favoriteVenues]);

  console.log('sortedVenues', sortedVenues, userProfile?.favoriteVenues);
  return (
    <FormField
      control={form.control}
      name="venue"
      render={({ field }) => (
        <FormItem className="flex-1">
          <FormLabel>Venue</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading venues...</span>
                    </div>
                  ) : (
                    <>
                      {field.value && field.value.label ? (
                        <div className="flex items-center gap-2">
                          {userProfile?.favoriteVenues?.includes(
                            field.value.id
                          ) && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          <span>{field.value.label}</span>
                        </div>
                      ) : (
                        'Select venue'
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search venue..." />
                <CommandList>
                  <CommandEmpty>No venue found.</CommandEmpty>
                  <CommandGroup>
                    {sortedVenues?.map((venue) => (
                      <CommandItem
                        key={venue?.id}
                        value={venue?.label}
                        onSelect={() => {
                          form.setValue('venue', venue);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              field.value.id === venue?.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          {userProfile?.favoriteVenues?.includes(venue.id) && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{venue.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {venue.addressLines}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
