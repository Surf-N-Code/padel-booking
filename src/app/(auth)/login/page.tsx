'use client';

import { LoginForm } from '@/components/login-form';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  return (
    <div>
      {registered && (
        <Alert className="max-w-md mx-auto mb-4" variant="success">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Registration successful! After logging in, please visit your profile
            settings to select your favorite padel locations!
          </AlertDescription>
        </Alert>
      )}
      <LoginForm />
    </div>
  );
}
