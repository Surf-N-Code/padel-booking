export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: string;
  name?: string;
  padelLevel?: string;
  favoriteVenues?: string[];
  telegramId?: string;
}

export interface Session {
  user: {
    id: string;
    email: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  telegramId?: string;
}

// Add this to properly type the session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
    };
  }
}
