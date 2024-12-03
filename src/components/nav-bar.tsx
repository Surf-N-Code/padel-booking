'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useSession, signOut } from 'next-auth/react';
import { UserCircle } from 'lucide-react';

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navigation = [
    { name: 'Games', href: '/' },
    { name: 'New Game', href: '/games/new' },
    ...(session?.user?.email === 'ndilthey@gmail.com'
      ? [{ name: 'Admin', href: '/admin/venues' }]
      : []),
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">
                  <UserCircle className="h-5 w-5 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
