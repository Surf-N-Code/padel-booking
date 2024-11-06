export interface Player {
  id: string
  name: string
  userId: string
}

export interface Game {
  id: string
  dateTime: string
  venue: string
  level: string
  createdAt: string
  createdBy: string
  players: Player[]
}

export const VENUES = [
  { value: "padel-club-1", label: "Padel Club 1" },
  { value: "padel-club-2", label: "Padel Club 2" },
  { value: "sports-center", label: "Sports Center" },
  { value: "indoor-arena", label: "Indoor Arena" },
] as const

export const GAME_LEVELS = [
  { value: "beginner", label: "Beginner (1.0-2.0)" },
  { value: "intermediate", label: "Intermediate (2.5-3.5)" },
  { value: "advanced", label: "Advanced (4.0-4.5)" },
  { value: "expert", label: "Expert (5.0+)" },
  { value: "mixed", label: "Mixed Levels" },
] as const 