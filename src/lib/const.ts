export const LEVEL_BADGES: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  beginner: { label: 'Beginner (0-2.0)', variant: 'outline' },
  intermediate: { label: 'Intermediate (2.5-3.5)', variant: 'secondary' },
  advanced: { label: 'Advanced (4.0-4.5)', variant: 'default' },
  expert: { label: 'Expert (5.0+)', variant: 'default' },
  mixed: { label: 'Mixed Levels', variant: 'secondary' },
};

export const TELEGRAM_SLASH_COMMANDS = {
  register: '/register',
  listGames: '/listgames',
  start: '/start',
  linkAccount: '/linkaccount',
};
