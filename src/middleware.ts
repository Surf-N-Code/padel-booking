import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from './routes';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  const nextUrl = request.nextUrl;
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoutes = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoutes = authRoutes.includes(nextUrl.pathname);

  console.log('auth middleware: ', {
    isApiAuthRoute,
    isPublicRoutes,
    isAuthRoutes,
    token,
  });

  if (isApiAuthRoute) {
    console.log('auth middleware: isApiAuthRoute', isApiAuthRoute);
    return NextResponse.next();
  }

  if (isAuthRoutes) {
    console.log('auth middleware: isAuthRoutes', isAuthRoutes);
    if (token) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  if (!token && !isPublicRoutes) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
