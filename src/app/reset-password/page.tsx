import { Suspense } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Şifre Sıfırla | OmniCore',
  description: 'OmniCore hesabınız için yeni şifre belirleyin.',
};

export default function ResetPasswordPage() {
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
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-muted" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

