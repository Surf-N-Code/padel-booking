'use client';

import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GAME_LEVELS } from '@/types/game';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { VenueCombobox } from './venue-combo-box';
import { fetchVenues } from '@/lib/api';

interface Venue {
  value: string;
  label: string;
}

const formSchema = z.object({
  date: z.date(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  venue: z.object({
    value: z.string().min(1),
    label: z.string().min(1),
  }),
  level: z.string().min(1),
  players: z.array(z.string().optional()).length(4),
});

export function NewGameForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  let {
    data: venues,
    isLoading: isLoadingVenues,
    error: venuesError,
  } = useQuery<Venue[]>({
    queryKey: ['venues'],
    queryFn: fetchVenues,
  });

  console.log('venues', venues);

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      date: new Date(),
      startTime: '',
      endTime: '',
      venue: {
        value: '',
        label: '',
      },
      level: 'mixed',
      players: ['', '', '', ''],
    },
  });

  useEffect(() => {
    if (venues && venues.length > 0 && !form.getValues('venue')) {
      form.setValue('venue', venues[0].value);
    }
  }, [venues, form]);

  const createGame = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const dateTime = new Date(values.date);
      const [startHour, startMinute] = values.startTime.split(':');
      dateTime.setHours(parseInt(startHour), parseInt(startMinute));

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateTime: dateTime.toISOString(),
          venue: values.venue,
          level: values.level,
          players: values.players.filter(Boolean).map((name) => ({
            id: crypto.randomUUID(),
            name,
            userId: 'temp-user-id',
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      router.push('/');
      router.refresh();
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createGame.mutate(values);
  }

  if (venuesError) {
    return (
      <div className="text-red-500">
        Error loading venues. Please try again later.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-xl"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={
                    field.value instanceof Date
                      ? field.value.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    field.onChange(date);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <VenueCombobox
            form={form}
            venues={venues}
            isLoading={isLoadingVenues}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Game Level</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GAME_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormLabel>Players</FormLabel>
          {[0, 1, 2, 3].map((index) => (
            <FormField
              key={index}
              control={form.control}
              name={`players.${index}`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={`Player ${index + 1}`}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createGame.isPending}
        >
          {createGame.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating game...</span>
            </div>
          ) : (
            'Create Game'
          )}
        </Button>
      </form>
    </Form>
  );
}
