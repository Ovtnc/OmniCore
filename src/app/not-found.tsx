import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">Bu sayfa bulunamadı.</p>
      <Button asChild>
        <Link href="/">Ana sayfaya dön</Link>
      </Button>
    </div>
  );
}
