import { RegisterForm } from '@/components/register-form';
import { Suspense } from 'react';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
