'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Link2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConnectionForm, type ConnectionFormValues } from '@/components/marketplace/ConnectionForm';
import { cn } from '@/lib/utils';
import { BrandChip } from '@/components/ui/brand-chip';

const PLATFORMS = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'N11', label: 'N11' },
  { value: 'SHOPIFY', label: 'Shopify' },
  { value: 'CICEKSEPETI', label: 'Çiçeksepeti' },
  { value: 'PAZARAMA', label: 'Pazarama' },
  { value: 'IDEFIX', label: 'İdefix' },
  { value: 'GOTURC', label: 'GoTurc' },
  { value: 'PTTAVM', label: 'PTT Avm' },
  { value: 'MODANISA', label: 'ModaNisa' },
  { value: 'ALLESGO', label: 'Allesgo' },
  { value: 'CIMRI', label: 'Cimri' },
  { value: 'AKAKCE', label: 'Akakçe' },
  { value: 'GOOGLE_MERCHANT', label: 'Google Merchant' },
  { value: 'META_CATALOG', label: 'Meta Katalog' },
  { value: 'GITTIGIDIYOR', label: 'GittiGidiyor' },
  { value: 'OTHER', label: 'Diğer' },
] as const;

type Store = { id: string; name: string; slug: string };
type Connection = {
  id: string;
  platform: string;
  sellerId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  _count: { listings: number };
};

export default function MarketplaceConnectionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [form, setForm] = useState<ConnectionFormValues>({
    platform: '',
    sellerId: '',
    apiKey: '',
    apiSecret: '',
    extraConfig: {},
  });

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          setStoreId(data[0].id);
        } else {
          setStores([]);
        }
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!storeId) {
      setConnections([]);
      return;
    }
    setLoading(true);
    fetch(`/api/stores/${storeId}/marketplace-connections`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setConnections(data) : setConnections([])))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !form.platform) return;
    setConnectionError(null);
    setSaving(true);
    const payload = {
      platform: form.platform,
      sellerId: form.sellerId || undefined,
      apiKey: form.apiKey || undefined,
      apiSecret: form.apiSecret || undefined,
      extraConfig: Object.keys(form.extraConfig ?? {}).length ? form.extraConfig : undefined,
    };
    try {
      const testRes = await fetch(`/api/stores/${storeId}/marketplace-connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const testData = await testRes.json().catch(() => ({}));
      if (!testRes.ok || testData.ok === false) {
        const err = testData.error || testData.message || 'Bağlantı testi başarısız';
        setConnectionError(err);
        return;
      }
      const res = await fetch(`/api/stores/${storeId}/marketplace-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectionError(data.error || 'Bağlantı eklenemedi');
        return;
      }
      setConnections((prev) => [
        {
          id: data.id,
          platform: data.platform,
          sellerId: null,
          isActive: data.isActive,
          lastSyncAt: null,
          createdAt: data.createdAt,
          _count: { listings: 0 },
        },
        ...prev,
      ]);
      setForm({ platform: '', sellerId: '', apiKey: '', apiSecret: '', extraConfig: {} });
      setShowForm(false);
      setConnectionError(null);
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Bağlantı eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!storeId || !confirm('Bu bağlantıyı kaldırmak istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(
        `/api/stores/${storeId}/marketplace-connections/${connectionId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Silinemedi');
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch {
      alert('Bağlantı silinemedi');
    }
  };

  const toggleActive = async (connectionId: string, isActive: boolean) => {
    if (!storeId) return;
    try {
      const res = await fetch(
        `/api/stores/${storeId}/marketplace-connections/${connectionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !isActive }),
        }
      );
      if (!res.ok) throw new Error('Güncellenemedi');
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, isActive: !isActive } : c))
      );
    } catch {
      alert('Durum güncellenemedi');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pazaryeri Bağlantıları</h1>
        <p className="text-muted-foreground">
          Trendyol, Hepsiburada ve diğer pazaryerleri için API ayarlarını yönetin.
        </p>
      </div>

      {loading && !storeId ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Önce bir mağaza oluşturmanız gerekiyor.{' '}
            <a href="/stores" className="text-primary underline">
              Mağazalar
            </a>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Bağlantılar
                </CardTitle>
                <CardDescription>
                  Bu mağaza için tanımlı pazaryeri entegrasyonları
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setConnectionError(null);
                  setShowForm((v) => !v);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Yeni bağlantı
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showForm && (
                <form
                  onSubmit={handleCreate}
                  className="rounded-lg border bg-muted/30 p-4 space-y-4"
                >
                  {connectionError && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{connectionError}</span>
                    </div>
                  )}
                  <ConnectionForm value={form} onChange={setForm} disabled={saving} />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving || !form.platform}>
                      {saving ? 'Test ediliyor / Kaydediliyor...' : 'Test et ve kaydet'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      İptal
                    </Button>
                  </div>
                </form>
              )}

              {loading ? (
                <p className="text-sm text-muted-foreground">Liste yükleniyor...</p>
              ) : connections.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Henüz bağlantı yok. &quot;Yeni bağlantı&quot; ile ekleyin.
                </p>
              ) : (
                <ul className="space-y-2">
                  {connections.map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3',
                        !c.isActive && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          <BrandChip
                            code={c.platform}
                            label={PLATFORMS.find((p) => p.value === c.platform)?.label ?? c.platform}
                          />
                        </span>
                        {c.sellerId && (
                          <span className="text-xs text-muted-foreground">
                            {c.sellerId}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {c._count.listings} liste
                        </span>
                        {c.lastSyncAt && (
                          <span className="text-xs text-muted-foreground">
                            Son sync: {new Date(c.lastSyncAt).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(c.id, c.isActive)}
                        >
                          {c.isActive ? 'Pasif yap' : 'Aktif yap'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(c.id)}
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
