'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Settings, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CURRENCIES = [{ value: 'TRY', label: 'TRY' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }];
const TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'İstanbul' },
  { value: 'Europe/London', label: 'Londra' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'America/New_York', label: 'New York' },
];
const LOCALES = [
  { value: 'tr-TR', label: 'Türkçe' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'Deutsch' },
];

type StoreOption = { id: string; name: string; slug: string };
type StoreDetail = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  currency: string;
  timezone: string;
  locale: string;
  status: string;
  settings: unknown;
};

export default function SettingsPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    domain: '',
    currency: 'TRY',
    timezone: 'Europe/Istanbul',
    locale: 'tr-TR',
  });

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          setStoreId(data[0].id);
        }
      })
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      return;
    }
    setLoading(true);
    fetch(`/api/stores/${storeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStore(null);
          return;
        }
        setStore(data);
        setForm({
          name: data.name ?? '',
          domain: data.domain ?? '',
          currency: data.currency ?? 'TRY',
          timezone: data.timezone ?? 'Europe/Istanbul',
          locale: data.locale ?? 'tr-TR',
        });
      })
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSaving(true);
    fetch(`/api/stores/${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        domain: form.domain || null,
        currency: form.currency,
        timezone: form.timezone,
        locale: form.locale,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStore(data);
        toast.success('Ayarlar kaydedildi.');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Kaydedilemedi'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Ayarlar</h1>
        <p className="mt-1 text-muted-foreground">
          Hesap ve mağaza ayarları.
        </p>
      </motion.div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Önce bir mağaza oluşturmanız gerekiyor.{' '}
            <Link href="/stores" className="text-primary underline">
              Mağazalar
            </Link>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Mağaza Ayarları
            </CardTitle>
            <CardDescription>
              Domain, para birimi, saat dilimi ve dil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label className="text-muted-foreground">Mağaza</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="w-full max-w-xs mt-1">
                  <SelectValue placeholder="Mağaza seçin" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-muted-foreground py-4">Yükleniyor...</p>
            ) : store ? (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div className="grid gap-2">
                  <Label htmlFor="name">Mağaza adı</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={form.domain}
                    onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                    placeholder="ornek.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Para birimi</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Saat dilimi</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Dil</Label>
                  <Select
                    value={form.locale}
                    onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/">Dashboard</Link>
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-muted-foreground">Mağaza bilgisi yüklenemedi.</p>
            )}
          </CardContent>
        </Card>
        </motion.div>
      )}
    </div>
  );
}
