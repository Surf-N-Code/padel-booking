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
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Steps, Step } from '@/components/ui/steps';

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
    notificationHours: z.array(z.string()).optional(),
    notificationsEnabled: z.boolean().optional(),
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
  )
  .refine(
    (data) => {
      // notificationHours should only be required when notificationsEnabled is true
      if (data.notificationsEnabled) {
        return data.notificationHours && data.notificationHours.length > 0;
      }
      return true;
    },
    {
      message: 'Select at least one hour when notifications are enabled',
      path: ['notificationHours'],
    }
  );

// Generate hours array
const HOURS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 7;
  return {
    value: hour.toString().padStart(2, '0'),
    label: hour.toString().padStart(2, '0') + ':00',
  };
});

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [venuesOpen, setVenuesOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [showTelegramDialog, setShowTelegramDialog] = useState(false);
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
      notificationHours: [],
      notificationsEnabled: true,
    },
  });

  // Update form values when user profile is loaded
  useEffect(() => {
    if (userProfile && !isInitialized) {
      console.log('userProfile in form: ', userProfile);
      form.reset({
        name: userProfile.name || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        padelLevel: userProfile.padelLevel || 'mixed',
        favoriteVenues: userProfile.favoriteVenues || [],
        notificationHours: userProfile.notificationHours || [],
        currentPassword: '',
        newPassword: '',
        notificationsEnabled: userProfile.notificationsEnabled,
      });
      setIsInitialized(true);
    }
  }, [userProfile, form, isInitialized]);

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    console.log('-------------', values);
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
        notificationHours: values.notificationHours, // Explicitly set notificationHours
        currentPassword: '',
        newPassword: '',
        notificationsEnabled: values.notificationsEnabled,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <FormLabel>Favorite Venues*</FormLabel>
                  <Popover open={venuesOpen} onOpenChange={setVenuesOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={venuesOpen}
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

            <FormField
              control={form.control}
              name="notificationHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Hours*</FormLabel>
                  <Popover open={hoursOpen} onOpenChange={setHoursOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={hoursOpen}
                          className="w-full justify-between"
                          disabled={!form.watch('notificationsEnabled')}
                        >
                          {field.value?.length && field.value.length > 0
                            ? `Selected ${field.value.length} hours`
                            : 'Select hours'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search hour..." />
                        <CommandList>
                          <CommandEmpty>No hour found.</CommandEmpty>
                          <CommandGroup>
                            {HOURS.map((hour) => (
                              <CommandItem
                                key={hour.value}
                                onSelect={() => {
                                  const currentValue = field.value || [];
                                  const newValue = currentValue.includes(
                                    hour.value
                                  )
                                    ? currentValue.filter(
                                        (v) => v !== hour.value
                                      )
                                    : [...currentValue, hour.value];
                                  field.onChange(newValue);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value?.includes(hour.value)
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {hour.label}
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

            <FormField
              control={form.control}
              name="notificationsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          setShowTelegramDialog(true);
                        }
                      }}
                    />
                  </FormControl>
                  <div
                    className="space-y-1 leading-none flex-1 cursor-pointer"
                    onClick={() => {
                      const newValue = !field.value;
                      field.onChange(newValue);
                      if (newValue) {
                        setShowTelegramDialog(true);
                      }
                    }}
                  >
                    <FormLabel>Enable Notifications</FormLabel>
                    <FormDescription>
                      Receive Telegram notifications for new games at your
                      favorite venues during selected hours.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <AlertDialog
              open={showTelegramDialog}
              onOpenChange={setShowTelegramDialog}
            >
              <AlertDialogContent className="sm:max-w-[500px]">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Setup Telegram Notifications
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    In order to receive Telegram notifications, you need to link
                    your Telegram account.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        window.open(
                          `https://t.me/PadelBabyBot?text=/linkaccount%20${session?.user?.email}`,
                          '_blank'
                        )
                      }
                    >
                      Link Telegram Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogHeader>
              </AlertDialogContent>
            </AlertDialog>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  );
}
