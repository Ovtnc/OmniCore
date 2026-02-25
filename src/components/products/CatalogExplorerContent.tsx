'use client';

import Link from 'next/link';
import { Folder, FolderOpen, Image as ImageIcon, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { ExplorerData, UploadDialogPayload } from './catalog-explorer-types';

const PLATFORM_LABELS: Record<string, string> = {
  TRENDYOL: 'TY',
  HEPSIBURADA: 'HB',
  AMAZON: 'AMZ',
  N11: 'N11',
  SHOPIFY: 'SH',
  CICEKSEPETI: 'ÇS',
  OTHER: '?',
};

function toPrice(v: number) {
  return Number.isFinite(v)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v)
    : '–';
}

type Props = {
  data: ExplorerData;
  buildUrl: (s?: string, c?: string) => string;
  storeId: string;
  categoryId: string;
  onUploadToMarketplace?: (payload: UploadDialogPayload) => void;
};

export function CatalogExplorerContent({ data, buildUrl, storeId, categoryId, onUploadToMarketplace }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
                <span className="font-medium text-foreground">{data.category.name}</span>
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

      <div>
        {data.view === 'stores' ? (
          <div key="stores" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.stores.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                Henüz mağaza yok.
              </p>
            ) : (
              data.stores.map((store) => (
                <Link key={store.id} href={buildUrl(store.id)}>
                  <div className="h-full">
                    <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
                        <Folder className="h-12 w-12 text-amber-500/90" />
                        <span className="text-center font-medium">{store.name}</span>
                        <Badge variant="secondary">{store.productCount} ürün</Badge>
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : data.view === 'categories' ? (
          <div key="categories" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.storeProductCount > 0 && (
              <div key="all" className="relative h-full group">
                <Link href={buildUrl(data.store.id, 'all')} className="block h-full">
                  <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
                      <FolderOpen className="h-12 w-12 text-blue-500/80" />
                      <span className="text-center font-medium">Tüm ürünler</span>
                      <Badge variant="secondary">{data.storeProductCount} ürün</Badge>
                    </CardContent>
                  </Card>
                </Link>
                {onUploadToMarketplace && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
            {data.categories.map((cat) => (
              <div key={cat.id} className="relative h-full group">
                <Link href={buildUrl(data.store.id, cat.id)} className="block h-full">
                  <Card
                    className={`h-full cursor-pointer transition-shadow hover:shadow-md ${
                      cat.productCount === 0 ? 'opacity-60' : ''
                    }`}
                  >
                    <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
                      <FolderOpen className="h-12 w-12 text-amber-500/80" />
                      <span className="text-center font-medium">{cat.name}</span>
                      <Badge variant={cat.productCount === 0 ? 'outline' : 'secondary'}>
                        {cat.productCount === 0 ? 'Boş' : `${cat.productCount} ürün`}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
                {onUploadToMarketplace && cat.productCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
            {data.categories.length === 0 && data.storeProductCount === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                Bu mağazada henüz kategori veya ürün yok. XML Sihirbazı veya liste görünümü ile ürün ekleyebilirsiniz.
              </p>
            )}
          </div>
        ) : data.view === 'products' ? (
          <div key="products" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.products.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                Bu kategoride ürün yok.
              </p>
            ) : (
              data.products.map((product) => (
                <div key={product.id}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
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
                              >
                                {PLATFORM_LABELS[p] ?? p}
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
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
