'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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

const CARGO_PROVIDERS: { value: string; label: string }[] = [
  { value: 'YURTICI', label: 'Yurtiçi Kargo' },
  { value: 'ARAS', label: 'Aras Kargo' },
  { value: 'MNG', label: 'MNG Kargo' },
  { value: 'PTT', label: 'PTT Kargo' },
  { value: 'SURAT', label: 'Sürat Kargo' },
  { value: 'HOROZ', label: 'Horoz Lojistik' },
  { value: 'OTHER', label: 'Diğer' },
];

type StoreOption = { id: string; name: string; slug: string };
type Setting = {
  id: string;
  provider: string;
  isActive: boolean;
  defaultWeight: number | string | null;
  createdAt: string;
};

export default function LogisticsPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    provider: '',
    apiKey: '',
    apiSecret: '',
    defaultWeight: '',
  });
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
      setSettings([]);
      return;
    }
    setLoading(true);
    fetch(`/api/stores/${storeId}/logistics-settings`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setSettings(data) : []))
      .catch(() => setSettings([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !form.provider) return;
    setError('');
    setSaving(true);
    fetch(`/api/stores/${storeId}/logistics-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: form.provider,
        apiKey: form.apiKey.trim() || undefined,
        apiSecret: form.apiSecret.trim() || undefined,
        defaultWeight: form.defaultWeight ? parseFloat(form.defaultWeight) : null,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSettings((prev) => [
          {
            id: data.id,
            provider: data.provider,
            isActive: data.isActive,
            defaultWeight: data.defaultWeight,
            createdAt: data.createdAt,
          },
          ...prev,
        ]);
        setForm({ provider: '', apiKey: '', apiSecret: '', defaultWeight: '' });
        setShowForm(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Eklenemedi'))
      .finally(() => setSaving(false));
  };

  const toggleActive = (id: string, isActive: boolean) => {
    fetch(`/api/stores/${storeId}/logistics-settings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, isActive: data.isActive } : s))
          );
        }
      })
      .catch(() => {});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bu kargo ayarını kaldırmak istediğinize emin misiniz?')) return;
    fetch(`/api/stores/${storeId}/logistics-settings/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setSettings((prev) => prev.filter((s) => s.id !== id));
      })
      .catch(() => {});
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kargo & Lojistik</h1>
        <p className="text-muted-foreground">
          Yurtiçi, Aras, MNG, PTT ve anında anlaşmalı kargo API entegrasyonları.
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
                <Truck className="h-5 w-5" />
                Kargo Entegrasyonları
              </CardTitle>
              <CardDescription>
                Kargo gönderisi oluşturma ve takip numarası güncelleme için API ayarlarını yapın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground py-4">Yükleniyor...</p>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => setShowForm(!showForm)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Kargo Ekle
                    </Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleCreate} className="border rounded-lg p-4 mb-6 space-y-4">
                      <div className="grid gap-2">
                        <Label>Kargo firması</Label>
                        <Select
                          value={form.provider}
                          onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {CARGO_PROVIDERS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>API Key (isteğe bağlı)</Label>
                        <Input
                          type="password"
                          value={form.apiKey}
                          onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>API Secret (isteğe bağlı)</Label>
                        <Input
                          type="password"
                          value={form.apiSecret}
                          onChange={(e) => setForm((f) => ({ ...f, apiSecret: e.target.value }))}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Varsayılan ağırlık (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={form.defaultWeight}
                          onChange={(e) => setForm((f) => ({ ...f, defaultWeight: e.target.value }))}
                          placeholder="Örn: 1"
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

                  {settings.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center">
                      Henüz kargo ayarı yok. &quot;Kargo Ekle&quot; ile ekleyin.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {settings.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between border rounded-lg px-4 py-3"
                        >
                          <div>
                            <span className="font-medium">
                              {CARGO_PROVIDERS.find((p) => p.value === s.provider)?.label ?? s.provider}
                            </span>
                            {s.defaultWeight != null && (
                              <span className="text-muted-foreground ml-2">
                                Varsayılan: {Number(s.defaultWeight)} kg
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(s.id, s.isActive)}
                              title={s.isActive ? 'Devre dışı bırak' : 'Etkinleştir'}
                            >
                              {s.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(s.id)}
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
