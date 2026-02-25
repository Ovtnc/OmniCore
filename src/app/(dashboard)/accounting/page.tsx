'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Play, RefreshCw } from 'lucide-react';
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

const PROVIDERS: { value: string; label: string }[] = [
  { value: 'LOGO', label: 'Logo' },
  { value: 'MIKRO', label: 'Mikro' },
  { value: 'DIA', label: 'DİA' },
  { value: 'PARASUT', label: 'Paraşüt' },
  { value: 'BIZIMHESAP', label: 'Bizimhesap' },
  { value: 'TURKCELL_ESIRKET', label: 'Turkcell e-Şirket' },
  { value: 'LINK', label: 'Link' },
  { value: 'ETA', label: 'ETA' },
  { value: 'OTHER', label: 'Diğer' },
];

type StoreOption = { id: string; name: string; slug: string };
type Integration = {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  createdAt: string;
};

export default function AccountingPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: '', name: '' });
  const [error, setError] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    fetch(`/api/stores/${storeId}/accounting-integrations`)
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
    fetch(`/api/stores/${storeId}/accounting-integrations`, {
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
            lastSyncAt: null,
            syncError: null,
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
    fetch(`/api/stores/${storeId}/accounting-integrations/${id}`, {
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
    if (!confirm('Bu muhasebe entegrasyonunu kaldırmak istediğinize emin misiniz?')) return;
    fetch(`/api/stores/${storeId}/accounting-integrations/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setIntegrations((prev) => prev.filter((i) => i.id !== id));
      })
      .catch(() => {});
  };

  const handleTest = (id: string) => {
    setActionMessage(null);
    setTestingId(id);
    fetch(`/api/stores/${storeId}/accounting-integrations/${id}/test`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setActionMessage({ type: 'success', text: data.message || 'Bağlantı başarılı' });
          setIntegrations((prev) =>
            prev.map((i) =>
              i.id === id
                ? { ...i, lastSyncAt: new Date().toISOString(), syncError: null }
                : i
            )
          );
        } else {
          setActionMessage({ type: 'error', text: data.error || 'Bağlantı testi başarısız' });
          setIntegrations((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, syncError: data.error || 'Hata' } : i
            )
          );
        }
      })
      .catch(() => setActionMessage({ type: 'error', text: 'Bağlantı testi yapılamadı' }))
      .finally(() => setTestingId(null));
  };

  const handleSync = (id: string) => {
    setActionMessage(null);
    setSyncingId(id);
    fetch(`/api/stores/${storeId}/accounting-integrations/${id}/sync`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setActionMessage({ type: 'success', text: data.message || 'Kuyruğa eklendi' });
          setIntegrations((prev) =>
            prev.map((i) => (i.id === id ? { ...i, syncError: null } : i))
          );
        } else {
          setActionMessage({ type: 'error', text: data.error || 'Eklenemedi' });
        }
      })
      .catch(() => setActionMessage({ type: 'error', text: 'İstek başarısız' }))
      .finally(() => setSyncingId(null));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">E-Fatura & Muhasebe</h1>
        <p className="text-muted-foreground">
          Logo, Mikro, DİA, Paraşüt, Bizimhesap, Turkcell e-Şirket entegrasyonları.
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
                <FileText className="h-5 w-5" />
                Muhasebe Entegrasyonları
              </CardTitle>
              <CardDescription>
                E-fatura gönderimi, fatura sorgulama ve ödeme yöntemleri (PayTR, İyzico, Cari/Havale) için entegrasyon ekleyin.
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
                      Entegrasyon Ekle
                    </Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleCreate} className="border rounded-lg p-4 mb-6 space-y-4">
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
                                {p.label}
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
                          placeholder="Örn: Logo Ana Hesap"
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

                  {actionMessage && (
                    <p
                      className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                        actionMessage.type === 'success'
                          ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }`}
                    >
                      {actionMessage.text}
                    </p>
                  )}
                  {integrations.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center">
                      Henüz muhasebe entegrasyonu yok. &quot;Entegrasyon Ekle&quot; ile ekleyin.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {integrations.map((i) => (
                        <li
                          key={i.id}
                          className="flex flex-wrap items-center justify-between gap-2 border rounded-lg px-4 py-3"
                        >
                          <div className="min-w-0">
                            <span className="font-medium">{i.name}</span>
                            <span className="text-muted-foreground ml-2">
                              ({PROVIDERS.find((p) => p.value === i.provider)?.label ?? i.provider})
                            </span>
                            {i.lastSyncAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Son test: {new Date(i.lastSyncAt).toLocaleString('tr-TR')}
                              </p>
                            )}
                            {i.syncError && (
                              <p className="text-sm text-destructive mt-1">{i.syncError}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTest(i.id)}
                              disabled={testingId !== null}
                              title="Bağlantıyı test et"
                            >
                              {testingId === i.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              <span className="ml-1.5 hidden sm:inline">Test et</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSync(i.id)}
                              disabled={syncingId !== null}
                              title="Senkronizasyonu kuyruğa ekle"
                            >
                              {syncingId === i.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="ml-1.5 hidden sm:inline">Senkronize et</span>
                            </Button>
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
