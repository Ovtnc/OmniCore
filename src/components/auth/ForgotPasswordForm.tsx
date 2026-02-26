'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        resetUrl?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'İstek başarısız');
      }
      setMessage(
        data.message ||
          'Eğer e-posta sistemde kayıtlıysa şifre sıfırlama bağlantısı oluşturuldu.'
      );
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İstek başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">Şifremi unuttum</CardTitle>
        <CardDescription>E-posta adresinizi girin, şifre sıfırlama bağlantısı oluşturulsun.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              {message}
            </div>
          )}
          {resetUrl && (
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
              <p className="mb-1 font-medium">Geliştirme bağlantısı:</p>
              <a className="break-all text-primary underline" href={resetUrl}>
                {resetUrl}
              </a>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="forgot-email">E-posta</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="ornek@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              'Sıfırlama bağlantısı oluştur'
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

