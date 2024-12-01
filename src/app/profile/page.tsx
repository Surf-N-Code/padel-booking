'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GAME_LEVELS } from '@/types/game';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { Venue } from '@/types/game';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

const profileFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email(),
    currentPassword: z.string().nullish(),
    newPassword: z.string().nullish(),
    padelLevel: z.string(),
    favoriteVenues: z.array(z.string()),
  })
  .refine(
    (data) => {
      if (!data.currentPassword && !data.newPassword) return true;
      return (
        data.currentPassword && data.newPassword && data.newPassword.length >= 6
      );
    },
    {
      message:
        'Both current and new password (min 6 chars) are required to change password',
      path: ['newPassword'],
    }
  );

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ['venues'],
    queryFn: async () => {
      const res = await fetch('/api/venues');
      if (!res.ok) throw new Error('Failed to fetch venues');
      return res.json();
    },
  });

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: session?.user?.email || '',
      padelLevel: 'mixed',
      favoriteVenues: [],
    },
  });

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          form.reset({
            name: userData.name || '',
            email: userData.email || '',
            padelLevel: userData.padelLevel || 'mixed',
            currentPassword: '',
            newPassword: '',
            favoriteVenues: userData.favoriteVenues || [],
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsInitialized(true);
      }
    }

    if (session?.user && !isInitialized) {
      fetchUserData();
    }
  }, [session, form, isInitialized]);

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      await update(data);
      form.reset({
        ...values,
        currentPassword: '',
        newPassword: '',
      });
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isInitialized) {
    return (
      <main className="container mx-auto py-10">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-10">
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Profile</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold">Profile Settings</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter to change password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="padelLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Padel Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your level" />
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

            <FormField
              control={form.control}
              name="favoriteVenues"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favorite Venues</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {field.value.length > 0
                            ? `${field.value.length} venues selected`
                            : 'Select favorite venues'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search venues..." />
                        <CommandList>
                          <CommandEmpty>No venue found.</CommandEmpty>
                          <ScrollArea className="h-[200px]">
                            <CommandGroup>
                              {venues.map((venue) => (
                                <CommandItem
                                  key={venue.id}
                                  onSelect={() => {
                                    const values = new Set(field.value);
                                    if (values.has(venue.id)) {
                                      values.delete(venue.id);
                                    } else {
                                      values.add(venue.id);
                                    }
                                    field.onChange(Array.from(values));
                                  }}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value.includes(venue.id)
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {venue.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {venue.addressLines}
                                      </span>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </ScrollArea>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  );
}
