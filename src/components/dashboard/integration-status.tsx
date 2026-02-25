'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

export function IntegrationStatus({
  marketplaceActive,
  accountingActive,
}: {
  marketplaceActive: number;
  accountingActive: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm font-medium">Pazaryeri bağlantıları</span>
        {marketplaceActive > 0 ? (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {marketplaceActive} aktif
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            Yok
          </span>
        )}
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm font-medium">E-Fatura / Muhasebe</span>
        {accountingActive > 0 ? (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {accountingActive} aktif
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            Yok
          </span>
        )}
      </div>
    </div>
  );
}
