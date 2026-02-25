'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderTree, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryManager } from '@/components/categories/CategoryManager';

type StoreOption = { id: string; name: string; slug: string };

export default function CategoriesPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setStores(d);
          if (d.length > 0 && !storeId) setStoreId(d[0].id);
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Ürünler
              </Link>
            </Button>
          </div>
          <h1 className="mt-2 text-2xl font-bold">Kategori yönetimi</h1>
          <p className="text-muted-foreground">
            Hiyerarşik kategoriler oluşturun. Klasör görünümünde mağaza ve kategorilere göre gezinin.
          </p>
        </div>
        <Button asChild>
          <Link href="/products">
            <FolderTree className="mr-2 h-4 w-4" />
            Katalog gezgini
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kategoriler</CardTitle>
          <CardDescription>
            Yeni kategori ekleyin, üst kategori seçin ve ikon atayın. Aynı mağaza altında aynı isimde iki kategori eklenemez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryManager
            stores={stores}
            storeId={storeId}
            onStoreChange={setStoreId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
