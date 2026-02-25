'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store as StoreIcon,
  Plus,
  Link2,
  Package,
  ShoppingCart,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Store = {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  domain: string | null;
  createdAt: string;
  tenant: { name: string; slug: string };
  _count: { products: number; marketplaceConnections: number; orders: number };
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif',
  SUSPENDED: 'Askıda',
  TRIAL: 'Deneme',
};

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', currency: 'TRY' });
  const [error, setError] = useState('');

  const fetchStores = () => {
    setLoading(true);
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStores(data);
        else setStores([]);
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(d?.error ?? 'Hata'));
        return r.json();
      })
      .then(() => {
        setForm({ name: '', slug: '', currency: 'TRY' });
        setShowForm(false);
        fetchStores();
      })
      .catch((err) => setError(typeof err === 'string' ? err : err?.error ?? 'Mağaza oluşturulamadı'))
      .finally(() => setSaving(false));
  };

  const slugFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mağazalar</h1>
          <p className="text-muted-foreground">
            Tenant bazlı mağaza listesi. Her mağaza kendi ürün, sipariş ve pazaryeri verisine sahiptir.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Yeni mağaza
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Yeni mağaza oluştur</CardTitle>
            <CardDescription>
              Mağaza adı ve benzersiz slug girin. Slug URL ve API için kullanılır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Mağaza adı</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({ ...f, name, slug: f.slug || slugFromName(name) }));
                  }}
                  placeholder="Örn. Ana Mağaza"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="ana-magaza"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="currency">Para birimi</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  placeholder="TRY"
                  className="max-w-[120px]"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive sm:col-span-2">{error}</p>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Oluşturuluyor…' : 'Oluştur'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setError('');
                  }}
                >
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5" />
            Mağaza listesi
          </CardTitle>
          <CardDescription>
            Tüm mağazalarınız. Pazaryeri ve ürün ayarlarına mağaza seçerek gidebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Henüz mağaza yok</p>
                <p className="text-sm text-muted-foreground">
                  Yeni mağaza ekleyerek başlayın. Önce sistemde bir tenant olmalıdır.
                </p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                İlk mağazayı oluştur
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <Card key={store.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{store.name}</CardTitle>
                        <CardDescription>
                          {store.tenant.name} / {store.slug}
                        </CardDescription>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          store.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : store.status === 'TRIAL'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABEL[store.status] ?? store.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {store._count.products} ürün
                      </span>
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" />
                        {store._count.marketplaceConnections} bağlantı
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {store._count.orders} sipariş
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href="/marketplace">
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          Pazaryeri
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/products">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
