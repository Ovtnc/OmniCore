'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Link2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandChip } from '@/components/ui/brand-chip';

type HealthItem = {
  id: string;
  storeId: string;
  storeName: string;
  platform: string;
  ok: boolean;
  error: string | null;
};

const PLATFORM_LABEL: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON: 'Amazon',
  N11: 'N11',
};

export function PlatformHealth() {
  const [items, setItems] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketplace/health')
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setItems(data) : setItems([])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="rounded-2xl border-border/40 bg-background/60 shadow-none ring-1 ring-white/5 backdrop-blur-sm dark:bg-background/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Platform Sağlık Durumu
            </CardTitle>
            <CardDescription>
              Pazaryeri API bağlantılarının geçerliliği
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/marketplace">Ayarlar <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              <span className="text-sm">Kontrol ediliyor…</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aktif pazaryeri bağlantısı yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.ok ? (
                      <>
                        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                      </>
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        <BrandChip code={item.platform} label={PLATFORM_LABEL[item.platform] ?? item.platform} />
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.storeName}
                        {item.error && (
                          <span className="text-destructive ml-1" title={item.error}>
                            · {item.error}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.ok
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {item.ok ? 'Geçerli' : 'Hata'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
