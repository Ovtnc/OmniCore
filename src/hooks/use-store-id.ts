'use client';

import { useMemo, useState } from 'react';

export interface StoreOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * Mağaza listesini çeker ve seçili storeId state'i döner.
 * Dashboard sayfalarında ortak kullanım için.
 */
export function useStoreId(stores: StoreOption[] | undefined) {
  const [storeId, setStoreId] = useState<string>(() => {
    if (stores?.length) return stores[0]!.id;
    return '';
  });

  const effectiveStoreId = useMemo(() => {
    if (!stores?.length) return '';
    const exists = stores.some((s) => s.id === storeId);
    return exists ? storeId : (stores[0]?.id ?? '');
  }, [stores, storeId]);

  return { storeId: effectiveStoreId, setStoreId, stores: stores ?? [] };
}
