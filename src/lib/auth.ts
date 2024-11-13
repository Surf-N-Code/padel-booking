import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { redis } from './redis';
import bcrypt from 'bcrypt';
import { User } from '@/types/auth';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('auth.ts: authorize', credentials);
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const userJson = await redis.get(`user:${credentials.email}`);
          console.log('auth.ts: userJson', userJson);
          if (!userJson) return null;

          const user = JSON.parse(userJson) as User;
          console.log('auth.ts: user', user);
          const passwordsMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );
          console.log('auth.ts: passwordsMatch', passwordsMatch);
          if (!passwordsMatch) return null;

          // Return sanitized user object
          const { password: _, ...userWithoutPassword } = user;
          console.log('auth.ts: userWithoutPassword', userWithoutPassword);
          return userWithoutPassword;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
