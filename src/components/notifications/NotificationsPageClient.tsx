'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { NotificationItem } from '@/lib/notifications';

const STORAGE_KEY = 'omnicore_notifications_last_seen_at';

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCandidateCount: number;
  serverTime: string;
};

function severityClass(severity: NotificationItem['severity']): string {
  switch (severity) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    case 'error':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

function SeverityIcon({ severity }: { severity: NotificationItem['severity'] }) {
  if (severity === 'success') return <CheckCircle2 className="h-4 w-4" />;
  if (severity === 'warning') return <TriangleAlert className="h-4 w-4" />;
  if (severity === 'error') return <XCircle className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

export function NotificationsPageClient() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'running' | 'unread'>('all');
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    if (Number.isFinite(parsed)) setLastSeenAt(parsed);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=100', { cache: 'no-store' });
      const data = (await res.json().catch(() => ({ items: [] }))) as NotificationsResponse;
      if (res.ok && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 10000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => items.filter((i) => new Date(i.createdAt).getTime() > lastSeenAt).length,
    [items, lastSeenAt]
  );
  const runningCount = useMemo(
    () => items.filter((i) => i.status === 'ACTIVE' || i.status === 'PENDING').length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (tab === 'running') return items.filter((i) => i.status === 'ACTIVE' || i.status === 'PENDING');
    if (tab === 'unread') return items.filter((i) => new Date(i.createdAt).getTime() > lastSeenAt);
    return items;
  }, [items, tab, lastSeenAt]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bildirimler</h1>
        <p className="text-muted-foreground">
          Kuyruktaki ve tamamlanan işlemler: ürün güncelleme, XML, muhasebe, lojistik.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtreler</CardTitle>
          <CardDescription>Okunmamışlar ve sıradaki işler dahil tüm hareketler.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === 'all' ? 'default' : 'outline'} onClick={() => setTab('all')}>
            Tümü ({items.length})
          </Button>
          <Button size="sm" variant={tab === 'running' ? 'default' : 'outline'} onClick={() => setTab('running')}>
            Sırada / Çalışıyor ({runningCount})
          </Button>
          <Button size="sm" variant={tab === 'unread' ? 'default' : 'outline'} onClick={() => setTab('unread')}>
            Okunmamış ({unreadCount})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const now = Date.now();
              setLastSeenAt(now);
              window.localStorage.setItem(STORAGE_KEY, String(now));
            }}
          >
            Tümünü Okundu Yap
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Bildirimler yükleniyor...
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu filtrede bildirim yok.</p>
          ) : (
            <ul className="space-y-3">
              {filteredItems.map((item) => (
                <li key={item.id} className="rounded-lg border p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <span className={`inline-flex items-center gap-1 text-xs ${severityClass(item.severity)}`}>
                      <SeverityIcon severity={item.severity} />
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  {item.productSummaries.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.productSummaries.join(' | ')}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">
                      {item.storeName} · {new Date(item.createdAt).toLocaleString('tr-TR')}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => router.push(item.href)}>
                      İlgili Sayfaya Git
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

