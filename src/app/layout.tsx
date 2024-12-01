'use client';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Providers from './provider';
import { AuthProvider } from '@/components/auth-provider';
import { NavBar } from '@/components/nav-bar';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Providers>
            <div className="px-4">
              <NavBar />
              <main className="px-4 mx-auto">{children}</main>
            </div>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
