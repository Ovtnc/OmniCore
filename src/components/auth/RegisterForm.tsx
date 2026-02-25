'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register, type RegisterState } from '@/lib/auth-actions';

const initialState: RegisterState = { ok: false, error: '' };

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(register, initialState);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } finally {
      setGoogleLoading(false);
    }
  }

  if (state.ok) {
    router.push('/login?registered=1');
    router.refresh();
    return (
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardContent className="flex flex-col items-center justify-center gap-4 pt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Yönlendiriliyorsunuz...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Kayıt ol</CardTitle>
        <CardDescription>Yeni bir hesap oluşturun veya Google ile devam edin.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.ok === false && state.error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="register-name">Ad Soyad</Label>
            <Input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Adınız Soyadınız"
              required
              disabled={isPending}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">E-posta</Label>
            <Input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@firma.com"
              required
              disabled={isPending}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Şifre</Label>
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="En az 8 karakter, harf ve rakam"
              required
              disabled={isPending}
              minLength={8}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-confirmPassword">Şifre (tekrar)</Label>
            <Input
              id="register-confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Şifrenizi tekrar girin"
              required
              disabled={isPending}
              className="bg-background"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kayıt yapılıyor...
              </>
            ) : (
              'Kayıt ol'
            )}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">veya</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={googleLoading}
            onClick={handleGoogle}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Google ile kayıt ol
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex justify-center border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Giriş yapın
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
