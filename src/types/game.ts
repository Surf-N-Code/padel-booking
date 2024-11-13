export interface Player {
  id: string;
  name: string;
  userId: string;
}

export interface Game {
  id: string;
  dateTime: string;
  venue: string;
  location: string;
  level: string;
  createdAt: string;
  createdBy: string;
  players: Player[];
}

export interface Venue {
  name: string;
  link: string;
  addressLines: string[];
}

export const GAME_LEVELS = [
  { value: 'beginner', label: 'Beginner (1.0-2.0)' },
  { value: 'intermediate', label: 'Intermediate (2.5-3.5)' },
  { value: 'advanced', label: 'Advanced (4.0-4.5)' },
  { value: 'expert', label: 'Expert (5.0+)' },
  { value: 'mixed', label: 'Mixed Levels' },
] as const;
