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
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GAME_LEVELS } from '@/types/game';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
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
import { Check, ChevronsUpDown, Star } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    padelLevel: z.string(),
    favoriteVenues: z
      .array(z.string())
      .nonempty('At least one favorite venue is required'),
  })
  .refine(
    (data) => {
      // If neither password field is filled, it's valid
      if (!data.currentPassword && !data.newPassword) return true;

      // If one is filled, both must be filled and new password must be 6+ chars
      if (data.currentPassword || data.newPassword) {
        return (
          data.currentPassword &&
          data.newPassword &&
          data.newPassword.length >= 6
        );
      }

      return true;
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
  const queryClient = useQueryClient();

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

  // Fetch venues
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
      lastName: '',
      email: session?.user?.email || '',
      padelLevel: 'mixed',
      favoriteVenues: [],
    },
  });

  // Update form values when user profile is loaded
  useEffect(() => {
    if (userProfile && !isInitialized) {
      form.reset({
        name: userProfile.name || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        padelLevel: userProfile.padelLevel || 'mixed',
        favoriteVenues: userProfile.favoriteVenues || [],
        currentPassword: '',
        newPassword: '',
      });
      setIsInitialized(true);
    }
  }, [userProfile, form, isInitialized]);

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

      // Invalidate queries and reset form
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsInitialized(false); // Force re-initialization with new data

      form.reset({
        ...values,
        favoriteVenues: values.favoriteVenues, // Explicitly set favoriteVenues
        currentPassword: '',
        newPassword: '',
      });
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Sort venues with favorites at top
  const sortedVenues = useMemo(() => {
    if (!venues || !form.getValues('favoriteVenues')) return venues;

    return [...venues].sort((a, b) => {
      const currentFavorites = form.getValues('favoriteVenues');
      const aIsFavorite = currentFavorites.includes(a.id);
      const bIsFavorite = currentFavorites.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [venues, form.watch('favoriteVenues')]); // Watch favoriteVenues changes

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        <CommandList>
                          <CommandInput placeholder="Search venues..." />
                          <ScrollArea className="h-[200px]">
                            <CommandGroup>
                              {sortedVenues?.map((venue) => (
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
                                    {field.value.includes(venue.id) && (
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    )}
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
