import { Suspense } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Giriş | OmniCore',
  description: 'OmniCore hesabınıza giriş yapın.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;
  const registered = params.registered === '1';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        OmniCore
      </Link>
      {registered && (
        <div className="mb-4 w-full max-w-md rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm text-green-700 dark:text-green-400">
          Hesabınız oluşturuldu. Giriş yapabilirsiniz.
        </div>
      )}
      <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse rounded-lg bg-muted" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
