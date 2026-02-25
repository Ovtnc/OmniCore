import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Şifremi Unuttum | OmniCore',
  description: 'Şifre sıfırlama.',
};

export default function ForgotPasswordPage() {
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
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader>
          <h1 className="text-xl font-semibold">Şifremi unuttum</h1>
          <p className="text-sm text-muted-foreground">
            Şifre sıfırlama özelliği yakında eklenecektir. Destek ile iletişime geçebilirsiniz.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Giriş sayfasına dön</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
