'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!token) {
      setError('Geçersiz sıfırlama bağlantısı.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Şifre güncellenemedi');
      }
      setSuccess(data.message || 'Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz.');
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şifre güncellenemedi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Yeni şifre belirle</CardTitle>
        <CardDescription>Hesabınız için yeni şifreyi girin.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!token && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Geçersiz sıfırlama bağlantısı.
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reset-password">Yeni şifre</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="En az 8 karakter, harf ve rakam"
              required
              disabled={loading || !token}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Yeni şifre (tekrar)</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || !token}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi güncelle'
            )}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="border-t pt-6">
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Giriş sayfasına dön</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

