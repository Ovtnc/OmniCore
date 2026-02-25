'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        Bir şeyler yanlış gitti
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'Sayfa yüklenirken hata oluştu.'}
      </p>
      <Button onClick={() => reset()}>
        Yeniden dene
      </Button>
    </div>
  );
}
