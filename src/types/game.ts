export interface Player {
  id: string
  name: string
  userId: string
}

export interface Game {
  id: string
  dateTime: string
  location: string
  level: string
  createdAt: string
  createdBy: string
  players: Player[]
} 