'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, FolderOpen, Image as ImageIcon, Search, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandChip } from '@/components/ui/brand-chip';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { ExplorerData, UploadDialogPayload } from './catalog-explorer-types';

function toPrice(v: number) {
  return Number.isFinite(v)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v)
    : '–';
}

function readableCategoryName(value: string) {
  return value
    .replace(/\s*>>>\s*/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

type Props = {
  data: ExplorerData;
  buildUrl: (s?: string, c?: string) => string;
  storeId: string;
  categoryId: string;
  onUploadToMarketplace?: (payload: UploadDialogPayload) => void;
};

export function CatalogExplorerContent({ data, buildUrl, storeId, categoryId, onUploadToMarketplace }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    setQuery('');
  }, [data.view, storeId, categoryId]);

  const filteredStores = useMemo(() => {
    if (data.view !== 'stores') return [];
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return data.stores;
    return data.stores.filter((store) => store.name.toLocaleLowerCase('tr-TR').includes(q));
  }, [data, query]);

  const filteredCategories = useMemo(() => {
    if (data.view !== 'categories') return [];
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return data.categories;
    return data.categories.filter((cat) =>
      readableCategoryName(cat.name).toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [data, query]);

  const filteredProducts = useMemo(() => {
    if (data.view !== 'products') return [];
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return data.products;
    return data.products.filter((product) =>
      [product.name, product.sku, product.brand ?? '']
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(q)
    );
  }, [data, query]);

  const hasSearch = data.view === 'stores' || data.view === 'categories' || data.view === 'products';
  const resultCount =
    data.view === 'stores'
      ? filteredStores.length
      : data.view === 'categories'
        ? filteredCategories.length + (data.storeProductCount > 0 ? 1 : 0)
        : data.view === 'products'
          ? filteredProducts.length
          : 0;

  return (
    <div className="space-y-6">
      {/* Sticky breadcrumb - always at top */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-background/80 px-1 pb-4 backdrop-blur-md">
        <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {storeId ? (
              <Link href={buildUrl()} className="transition-colors hover:text-foreground">
                Tüm Mağazalar
              </Link>
            ) : (
              <span className="font-medium text-foreground">Tüm Mağazalar</span>
            )}
          </BreadcrumbItem>
          {data.view !== 'stores' && data.store && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {categoryId ? (
                  <Link
                    href={buildUrl(data.store.id)}
                    className="transition-colors hover:text-foreground"
                  >
                    {data.store.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{data.store.name}</span>
                )}
              </BreadcrumbItem>
            </>
          )}
          {data.view === 'products' && data.category && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="font-medium text-foreground">
                  {readableCategoryName(data.category.name)}
                </span>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
        {onUploadToMarketplace && data.view === 'products' && data.store && data.category && (
          <Button
            variant="default"
            size="sm"
            className="shrink-0"
            onClick={() =>
              onUploadToMarketplace({
                storeId: data.store.id,
                categoryId: data.category.id,
                categoryName: data.category.name,
              })
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            Pazaryerine Gönder
          </Button>
        )}
      </div>

      {hasSearch && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  data.view === 'stores'
                    ? 'Mağaza ara...'
                    : data.view === 'categories'
                      ? 'Kategori ara...'
                      : 'Ürün adı, SKU veya marka ara...'
                }
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {query.trim() ? `Filtre sonucu: ${resultCount}` : `Toplam: ${resultCount}`}
            </p>
          </div>
        </div>
      )}

      <div>
        {data.view === 'stores' ? (
          <div key="stores" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredStores.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                {query.trim() ? 'Aramaya uygun mağaza bulunamadı.' : 'Henüz mağaza yok.'}
              </p>
            ) : (
              filteredStores.map((store) => (
                <Link key={store.id} href={buildUrl(store.id)}>
                  <motion.div
                    className="h-full"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full cursor-pointer transition-shadow hover:shadow-xl">
                      <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Store className="h-7 w-7" strokeWidth={1.5} />
                        </div>
                        <span className="text-center font-medium">{store.name}</span>
                        <Badge variant="secondary" className="rounded-full">{store.productCount} ürün</Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        ) : data.view === 'categories' ? (
          <div key="categories" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.storeProductCount > 0 && (
              <div key="all" className="flex flex-col gap-2">
                <Link href={buildUrl(data.store.id, 'all')} className="block h-full">
                  <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <Card className="h-full cursor-pointer transition-shadow hover:shadow-xl">
                      <CardContent className="flex h-full flex-col gap-3 p-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <FolderOpen className="h-7 w-7" strokeWidth={1.5} />
                        </div>
                      <span className="line-clamp-2 min-h-12 text-base font-medium leading-6">
                        Tüm ürünler
                      </span>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <Badge variant="secondary">{data.storeProductCount} ürün</Badge>
                        <span className="text-xs text-muted-foreground">Klasörü aç</span>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </Link>
                {onUploadToMarketplace && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      onUploadToMarketplace({
                        storeId: data.store.id,
                        categoryId: 'all',
                        categoryName: 'Tüm ürünler',
                      });
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Pazaryerine Gönder
                  </Button>
                )}
              </div>
            )}
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-2">
                <Link href={buildUrl(data.store.id, cat.id)} className="block h-full">
                  <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="h-full">
                    <Card
                      className={`h-full cursor-pointer transition-shadow hover:shadow-xl ${
                        cat.productCount === 0 ? 'opacity-60' : ''
                      }`}
                    >
                      <CardContent className="flex h-full flex-col gap-3 p-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <FolderOpen className="h-7 w-7" strokeWidth={1.5} />
                        </div>
                      <span className="line-clamp-3 min-h-16 text-base font-medium leading-6">
                        {readableCategoryName(cat.name)}
                      </span>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <Badge variant={cat.productCount === 0 ? 'outline' : 'secondary'}>
                          {cat.productCount === 0 ? 'Boş' : `${cat.productCount} ürün`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Klasörü aç</span>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </Link>
                {onUploadToMarketplace && cat.productCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      onUploadToMarketplace({
                        storeId: data.store.id,
                        categoryId: cat.id,
                        categoryName: cat.name,
                      });
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Pazaryerine Gönder
                  </Button>
                )}
              </div>
            ))}
            {filteredCategories.length === 0 && data.storeProductCount === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? 'Aramaya uygun kategori bulunamadı.'
                  : 'Bu mağazada henüz kategori veya ürün yok. XML Sihirbazı veya liste görünümü ile ürün ekleyebilirsiniz.'}
              </p>
            )}
          </div>
        ) : data.view === 'products' ? (
          <div key="products" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                {query.trim() ? 'Aramaya uygun ürün bulunamadı.' : 'Bu kategoride ürün yok.'}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <motion.div key={product.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-xl">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted/30 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {product.platforms.length > 0 && (
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            {product.platforms.slice(0, 4).map((p) => (
                              <Badge
                                key={p}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                                title={p}
                              >
                                <BrandChip code={p} showLabel={false} logoClassName="h-3.5 w-3.5" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                        <p className="text-sm font-semibold">{toPrice(product.salePrice)}</p>
                        {!product.isActive && (
                          <Badge variant="muted" className="text-xs">Pasif</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
