'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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

interface VenueComboboxProps {
  form: any; // Replace with your form type
  venues: Venue[] | undefined;
  isLoading: boolean;
}

export function VenueCombobox({ form, venues, isLoading }: VenueComboboxProps) {
  const [open, setOpen] = React.useState(false);

  console.log('venues', typeof venues, venues?.length);

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
                      {field.value && venues
                        ? venues.find((venue) => venue.id === field.value.id)
                            ?.label
                        : 'Select venue'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search venue..." />
                <CommandList>
                  <CommandEmpty>No venue found.</CommandEmpty>
                  <CommandGroup>
                    {venues &&
                      venues.length > 0 &&
                      venues?.map((venue, idx) => (
                        <CommandItem
                          key={venue?.id}
                          value={venue?.label}
                          onSelect={() => {
                            form.setValue('venue', venue);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              field.value.id === venue?.id
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
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
