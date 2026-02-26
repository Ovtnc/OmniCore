'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Clock3, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);
  const [panelWidth, setPanelWidth] = useState<number>(672);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    if (Number.isFinite(parsed)) setLastSeenAt(parsed);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20', { cache: 'no-store' });
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
    const t = setInterval(fetchNotifications, 8000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => items.filter((i) => new Date(i.createdAt).getTime() > lastSeenAt).length,
    [items, lastSeenAt]
  );

  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    setLastSeenAt(now);
    window.localStorage.setItem(STORAGE_KEY, String(now));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  useEffect(() => {
    const updateWidth = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      setPanelWidth(Math.min(672, Math.max(320, w - 24)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div className="relative" ref={(el) => { containerRef.current = el; }}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirimler"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-500/80" />
          </>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 rounded-xl border bg-background p-0 shadow-2xl"
          style={{ width: panelWidth }}
        >
          <div className="border-b px-4 py-3">
            <p className="text-base font-semibold">Bildirimler</p>
            <p className="text-xs text-muted-foreground">
              Sıradaki ve tamamlanan işlemler. Okunmamış: {unreadCount}
            </p>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {loading ? 'Yükleniyor...' : `Toplam ${items.length} bildirim`}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  router.push('/notifications');
                }}
              >
                Hepsini Gör
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Bildirimler yükleniyor...
              </div>
            ) : items.length === 0 ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">Henüz bildirim yok.</p>
            ) : (
              <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className={`inline-flex items-center gap-1 text-xs ${severityClass(item.severity)}`}>
                          <SeverityIcon severity={item.severity} />
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                      {item.productSummaries.length > 0 && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.productSummaries.join(' | ')}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {item.storeName} · {new Date(item.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
