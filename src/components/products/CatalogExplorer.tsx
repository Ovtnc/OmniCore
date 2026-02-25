'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ExplorerData } from './catalog-explorer-types';
import { CatalogExplorerContent } from './CatalogExplorerContent';
import { CategoryUploadDialog } from './CategoryUploadDialog';
import type { UploadDialogPayload } from './catalog-explorer-types';

export function CatalogExplorer() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const [data, setData] = useState<ExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadPayload, setUploadPayload] = useState<UploadDialogPayload | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId) params.set('storeId', storeId);
    if (categoryId) params.set('categoryId', categoryId);
    fetch(`/api/catalog/explorer?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.view) setData(d);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [storeId, categoryId]);

  const buildUrl = (s?: string, c?: string) => {
    const p = new URLSearchParams();
    if (s) p.set('storeId', s);
    if (c) p.set('categoryId', c);
    const q = p.toString();
    return q ? `/products?${q}` : '/products';
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
        <p className="text-sm text-muted-foreground">Katalog yüklenemedi.</p>
      </div>
    );
  }
  const handleUploadClick = (payload: UploadDialogPayload) => {
    setUploadPayload(payload);
    setUploadDialogOpen(true);
  };

  return (
    <>
      <CatalogExplorerContent
        data={data}
        buildUrl={buildUrl}
        storeId={storeId}
        categoryId={categoryId}
        onUploadToMarketplace={handleUploadClick}
      />
      {uploadPayload && (
        <CategoryUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          storeId={uploadPayload.storeId}
          categoryId={uploadPayload.categoryId}
          categoryName={uploadPayload.categoryName}
        />
      )}
    </>
  );
}
