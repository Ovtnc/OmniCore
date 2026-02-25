'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        Bu sayfa yüklenemedi
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'Bir hata oluştu. Yeniden deneyebilir veya ana sayfaya dönebilirsiniz.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Yeniden dene</Button>
        <Button variant="outline" asChild>
          <Link href="/">Ana sayfa</Link>
        </Button>
      </div>
    </div>
  );
}
