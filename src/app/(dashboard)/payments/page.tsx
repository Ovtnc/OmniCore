'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandChip } from '@/components/ui/brand-chip';

const PROVIDERS: { value: string; label: string }[] = [
  { value: 'PAYTR', label: 'PayTR' },
  { value: 'IYZICO', label: 'İyzico' },
  { value: 'CARI_HAVALE', label: 'Cari / Havale' },
  { value: 'BANK_TRANSFER', label: 'Banka transferi' },
  { value: 'OTHER', label: 'Diğer' },
];

type StoreOption = { id: string; name: string; slug: string };
type Integration = {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export default function PaymentsPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: '', name: '' });
  const [error, setError] = useState('');

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
      setIntegrations([]);
      return;
    }
    setLoading(true);
    fetch(`/api/stores/${storeId}/payment-integrations`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setIntegrations(data) : []))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !form.provider) return;
    setError('');
    setSaving(true);
    fetch(`/api/stores/${storeId}/payment-integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: form.provider,
        name: form.name.trim() || form.provider,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setIntegrations((prev) => [
          {
            id: data.id,
            provider: data.provider,
            name: data.name,
            isActive: data.isActive,
            createdAt: data.createdAt,
          },
          ...prev,
        ]);
        setForm({ provider: '', name: '' });
        setShowForm(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Eklenemedi'))
      .finally(() => setSaving(false));
  };

  const toggleActive = (id: string, isActive: boolean) => {
    fetch(`/api/stores/${storeId}/payment-integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setIntegrations((prev) =>
            prev.map((i) => (i.id === id ? { ...i, isActive: data.isActive } : i))
          );
        }
      })
      .catch(() => {});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bu ödeme entegrasyonunu kaldırmak istediğinize emin misiniz?')) return;
    fetch(`/api/stores/${storeId}/payment-integrations/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setIntegrations((prev) => prev.filter((i) => i.id !== id));
      })
      .catch(() => {});
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">E-Fatura & Ödeme</h1>
        <p className="text-muted-foreground">
          PayTR, İyzico, cari/havale ve banka transferi entegrasyonları.
        </p>
      </div>

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
        <>
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Mağaza</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="w-full max-w-xs">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ödeme Entegrasyonları
              </CardTitle>
              <CardDescription>
                Ödeme altyapısı (PayTR, İyzico) ve cari/havale hesapları için entegrasyon ekleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-4 text-muted-foreground">Yükleniyor...</p>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button onClick={() => setShowForm(!showForm)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Entegrasyon Ekle
                    </Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleCreate} className="mb-6 space-y-4 rounded-lg border p-4">
                      <div className="grid gap-2">
                        <Label>Sağlayıcı</Label>
                        <Select
                          value={form.provider}
                          onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDERS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                <BrandChip code={p.value} label={p.label} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Ad (isteğe bağlı)</Label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Örn: PayTR Ana"
                        />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" disabled={saving}>
                          {saving ? 'Ekleniyor...' : 'Ekle'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                          İptal
                        </Button>
                      </div>
                    </form>
                  )}

                  {integrations.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">
                      Henüz ödeme entegrasyonu yok. &quot;Entegrasyon Ekle&quot; ile ekleyin.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {integrations.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between rounded-lg border px-4 py-3"
                        >
                          <div>
                            <span className="font-medium">{i.name}</span>
                            <span className="ml-2 text-muted-foreground">
                              (<BrandChip
                                code={i.provider}
                                label={PROVIDERS.find((p) => p.value === i.provider)?.label ?? i.provider}
                              />)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(i.id, i.isActive)}
                              title={i.isActive ? 'Devre dışı bırak' : 'Etkinleştir'}
                            >
                              {i.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(i.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
