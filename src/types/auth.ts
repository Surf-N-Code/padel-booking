export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: string;
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
}
