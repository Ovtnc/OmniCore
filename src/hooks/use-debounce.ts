'use client';

import { useEffect, useState } from 'react';

/**
 * Değeri geciktirilmiş (debounced) olarak günceller.
 * Arama kutusu, filtre vb. için kullanılır.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
