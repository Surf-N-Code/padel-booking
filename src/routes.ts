export const publicRoutes: string[] = [
  '/verify',
  '/imprint',
  '/terms',
  '/api/webhook/resend',
];

export const authRoutes: string[] = [
  '/login',
  '/register',
  '/error',
  '/resend',
  '/reset',
  '/new-password',
  '/two-factor',
];

export const dashboardRoutes: Record<string, string> = {
  dashboard: '/',
  newGame: '/new-game',
};

export const apiAuthPrefix: string = '/api/auth';

export const DEFAULT_LOGIN_REDIRECT: string = '/';
