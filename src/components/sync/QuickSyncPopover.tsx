'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandChip } from '@/components/ui/brand-chip';

type StoreOption = { id: string; name: string; slug: string };
type Connection = { id: string; platform: string; isActive: boolean };
type CandidateItem = {
  id: string;
  sku: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  unsyncedConnections: Array<{
    connectionId: string;
    platform: string;
    status: string;
    lastSyncAt: string | null;
    syncError: string | null;
  }>;
};

type CandidatesResponse = {
  items: CandidateItem[];
  connections: Connection[];
  total: number;
};

type SyncJobState = {
  jobId: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  completed: string[];
  failed: string[];
  sentProductIds: string[];
  error?: string;
};

const JOB_STATUS_LABEL: Record<SyncJobState['status'], string> = {
  PENDING: 'Sıraya alındı',
  ACTIVE: 'Yükleniyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Hata',
  CANCELLED: 'İptal edildi',
};

export function QuickSyncPopover() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncJob, setSyncJob] = useState<SyncJobState | null>(null);

  const loadStores = useCallback(async () => {
    const res = await fetch('/api/stores', { cache: 'no-store' });
    const data = (await res.json().catch(() => [])) as StoreOption[];
    const list = Array.isArray(data) ? data : [];
    setStores(list);
    if (!storeId && list.length > 0) setStoreId(list[0].id);
  }, [storeId]);

  const loadCandidates = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/stores/${sid}/sync-candidates?limit=100`, {
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({ items: [], connections: [] }))) as CandidatesResponse;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Adaylar alınamadı');

      const conns = Array.isArray(data.connections) ? data.connections : [];
      const rows = Array.isArray(data.items) ? data.items : [];
      setConnections(conns);
      setItems(rows);
      setSelectedConnectionIds(conns.map((c) => c.id));
      setSelectedProductIds(rows.slice(0, 20).map((r) => r.id));
    } catch (e) {
      setConnections([]);
      setItems([]);
      setSelectedConnectionIds([]);
      setSelectedProductIds([]);
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Adaylar alınamadı' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadStores();
  }, [open, loadStores]);

  useEffect(() => {
    if (!open || !storeId) return;
    loadCandidates(storeId);
  }, [open, storeId, loadCandidates]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const visibleItems = useMemo(() => {
    if (selectedConnectionIds.length === 0) return [];
    const selectedSet = new Set(selectedConnectionIds);
    return items.filter((item) =>
      item.unsyncedConnections.some(
        (u) => selectedSet.has(u.connectionId) && u.status !== 'ACTIVE'
      )
    );
  }, [items, selectedConnectionIds]);

  const selectedConnectionsByItem = useMemo(() => {
    const selectedSet = new Set(selectedConnectionIds);
    return new Map(
      visibleItems.map((item) => [
        item.id,
        item.unsyncedConnections.filter((u) => selectedSet.has(u.connectionId)),
      ])
    );
  }, [visibleItems, selectedConnectionIds]);

  const rowStatusMap = useMemo(() => {
    const map = new Map<string, { text: string; tone: 'muted' | 'info' | 'success' | 'error' }>();
    if (!syncJob) return map;

    const completedSet = new Set(syncJob.completed);
    const failedSet = new Set(syncJob.failed);
    const sentSet = new Set(syncJob.sentProductIds);

    for (const productId of syncJob.sentProductIds) {
      if (completedSet.has(productId)) {
        map.set(productId, { text: 'Tamamlandı', tone: 'success' });
      } else if (failedSet.has(productId)) {
        map.set(productId, { text: 'Hata', tone: 'error' });
      } else if (syncJob.status === 'ACTIVE') {
        map.set(productId, { text: 'Yükleniyor', tone: 'info' });
      } else if (syncJob.status === 'PENDING') {
        map.set(productId, { text: 'Sıraya alındı', tone: 'muted' });
      } else if (syncJob.status === 'FAILED') {
        map.set(productId, { text: 'Job hatası', tone: 'error' });
      }
    }

    // Listeye yeni gelen ama aynı job'da olmayanlar için map boş kalır.
    for (const item of items) {
      if (!sentSet.has(item.id) && !map.has(item.id)) {
        map.set(item.id, { text: 'Bekliyor', tone: 'muted' });
      }
    }

    return map;
  }, [syncJob, items]);

  const fallbackRowStatusMap = useMemo(() => {
    const map = new Map<string, { text: string; tone: 'muted' | 'info' | 'success' | 'error' }>();
    for (const item of visibleItems) {
      const selected = selectedConnectionsByItem.get(item.id) ?? [];
      if (selected.length === 0) {
        map.set(item.id, { text: 'Bekliyor', tone: 'muted' });
        continue;
      }
      const hasError = selected.some((s) => s.status === 'SYNC_ERROR' || !!s.syncError);
      if (hasError) {
        map.set(item.id, { text: 'Hata', tone: 'error' });
        continue;
      }
      const allActive = selected.every((s) => s.status === 'ACTIVE');
      if (allActive) {
        map.set(item.id, { text: 'Senkronize', tone: 'success' });
        continue;
      }
      const hasPending = selected.some((s) => s.status === 'PENDING');
      if (hasPending) {
        map.set(item.id, { text: 'Bekliyor', tone: 'muted' });
        continue;
      }
      map.set(item.id, { text: 'İşlenecek', tone: 'info' });
    }
    return map;
  }, [visibleItems, selectedConnectionsByItem]);

  const isJobRunning = syncJob?.status === 'PENDING' || syncJob?.status === 'ACTIVE';

  useEffect(() => {
    const visibleSet = new Set(visibleItems.map((i) => i.id));
    setSelectedProductIds((prev) => prev.filter((id) => visibleSet.has(id)));
  }, [visibleItems]);

  async function sendSelected() {
    if (!storeId || selectedProductIds.length === 0 || selectedConnectionIds.length === 0) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/marketplace-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProductIds,
          connectionIds: selectedConnectionIds,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        queued?: number;
        jobId?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Gönderim başarısız');
      }
      setMessage({
        type: 'success',
        text: `${data.queued ?? selectedProductIds.length} ürün kuyruğa eklendi. Job: ${data.jobId ?? '-'}`,
      });
      if (data.jobId) {
        setSyncJob({
          jobId: data.jobId,
          status: 'PENDING',
          completed: [],
          failed: [],
          sentProductIds: [...selectedProductIds],
        });
      }
      await loadCandidates(storeId);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Gönderim başarısız' });
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!syncJob || !storeId) return;
    if (syncJob.status === 'COMPLETED' || syncJob.status === 'FAILED' || syncJob.status === 'CANCELLED') {
      return;
    }

    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${syncJob.jobId}`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as {
          status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          result?: { completed?: string[]; failed?: string[] };
          error?: string;
        };
        if (!res.ok || stopped) return;

        setSyncJob((prev) => {
          if (!prev || prev.jobId !== syncJob.jobId) return prev;
          return {
            ...prev,
            status: data.status ?? prev.status,
            completed: Array.isArray(data.result?.completed) ? data.result!.completed! : prev.completed,
            failed: Array.isArray(data.result?.failed) ? data.result!.failed! : prev.failed,
            error: data.error,
          };
        });

        const terminal = data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED';
        if (terminal) {
          await loadCandidates(storeId);
        }
      } catch {
        // polling sessizce devam etsin
      }
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [syncJob, storeId, loadCandidates]);

  return (
    <div className="relative" ref={containerRef}>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-2">
        <Link2 className="h-4 w-4" />
        Senkronizasyon
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(760px,calc(100vw-24px))] rounded-xl border bg-background shadow-2xl">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Hızlı Senkronizasyon</p>
            <p className="text-xs text-muted-foreground">
              XML sonrası pazaryerine gitmeyen ürünleri seçip doğrudan gönderin.
            </p>
          </div>

          <div className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Mağaza</p>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger>
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
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Pazaryerleri</p>
                <div className="max-h-24 overflow-y-auto rounded-md border p-2">
                  {connections.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aktif bağlantı yok.</p>
                  ) : (
                    <div className="space-y-1">
                      {connections.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedConnectionIds.includes(c.id)}
                            onChange={(e) => {
                              setSelectedConnectionIds((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                              );
                            }}
                          />
                          <BrandChip code={c.platform} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {message && (
              <p
                className={
                  message.type === 'success'
                    ? 'rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400'
                    : 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'
                }
              >
                {message.text}
              </p>
            )}

            {syncJob && (
              <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  {isJobRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Kuyruk durumu: <strong>{JOB_STATUS_LABEL[syncJob.status]}</strong>
                </p>
                <p className="mt-1">
                  Toplam: {syncJob.sentProductIds.length}
                  {' · '}Tamamlanan: {syncJob.completed.length}
                  {' · '}Hatalı: {syncJob.failed.length}
                </p>
                {syncJob.error && <p className="mt-1 text-destructive">Hata: {syncJob.error}</p>}
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aday ürünler yükleniyor...
              </div>
            ) : visibleItems.length === 0 ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">
                Bu mağaza/pazaryeri kombinasyonunda gösterilecek ürün yok.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.length > 0 && selectedProductIds.length === visibleItems.length}
                          onChange={(e) =>
                            setSelectedProductIds(e.target.checked ? visibleItems.map((i) => i.id) : [])
                          }
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Ürün</th>
                      <th className="px-3 py-2 text-left">Eksik Pazarlar</th>
                      <th className="px-3 py-2 text-left">Durum</th>
                      <th className="px-3 py-2 text-left">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(item.id)}
                            onChange={(e) =>
                              setSelectedProductIds((prev) =>
                                e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {(selectedConnectionsByItem.get(item.id) ?? []).filter((u) => u.status !== 'ACTIVE').length === 0 ? (
                            <span>Yok</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(selectedConnectionsByItem.get(item.id) ?? [])
                                .filter((u) => u.status !== 'ACTIVE')
                                .map((u) => (
                                  <BrandChip key={`${item.id}-${u.connectionId}`} code={u.platform} />
                                ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {(() => {
                            const st =
                              rowStatusMap.get(item.id) ??
                              fallbackRowStatusMap.get(item.id) ??
                              { text: 'Bekliyor', tone: 'muted' as const };
                            const cls =
                              st.tone === 'success'
                                ? 'text-green-600 dark:text-green-400'
                                : st.tone === 'error'
                                  ? 'text-destructive'
                                  : st.tone === 'info'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-muted-foreground';
                            return <span className={cls}>{st.text}</span>;
                          })()}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(item.updatedAt ?? item.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Seçilen ürün: {selectedProductIds.length} · Seçilen pazar: {selectedConnectionIds.length}
              </p>
              <Button
                size="sm"
                onClick={sendSelected}
                disabled={
                  sending ||
                  selectedProductIds.length === 0 ||
                  selectedConnectionIds.length === 0
                }
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Seçilenleri Gönder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
