'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, ChevronRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Suggestion = {
  id: string;
  productName: string;
  suggestedCategoryName: string | null;
  suggestedCategoryId: string;
  confidence: number | string;
  platform: string;
  store: { name: string };
  createdAt: string;
};

export function AIMatchReview() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchList = () => {
    fetch('/api/ai/category-suggestions?status=PENDING&maxConfidence=0.85')
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setItems(data) : setItems([])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
    const t = setInterval(fetchList, 15000);
    return () => clearInterval(t);
  }, []);

  const handleReview = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdating(id);
    fetch(`/api/ai/category-suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(() => fetchList())
      .finally(() => setUpdating(null));
  };

  const confidencePct = (c: number | string) =>
    Math.round((typeof c === 'number' ? c : parseFloat(String(c))) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Eşleştirme Onayı
            </CardTitle>
            <CardDescription>
              Düşük güven skorlu kategori eşleştirmeleri. Onayla veya reddet.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tools">Tümü <ChevronRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Onay bekleyen eşleştirme yok.
            </p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence>
                {items.slice(0, 5).map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{item.productName}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3 shrink-0" />
                        {item.suggestedCategoryName ?? item.suggestedCategoryId}
                        <span className="text-amber-600 dark:text-amber-400">
                          · %{confidencePct(item.confidence)} güven
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                        onClick={() => handleReview(item.id, 'APPROVED')}
                        disabled={updating === item.id}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleReview(item.id, 'REJECTED')}
                        disabled={updating === item.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
