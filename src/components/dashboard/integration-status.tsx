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
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
        <span className="text-sm font-medium">Pazaryeri bağlantıları</span>
        {marketplaceActive > 0 ? (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {marketplaceActive} aktif
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            Yok
          </span>
        )}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
        <span className="text-sm font-medium">E-Fatura / Muhasebe</span>
        {accountingActive > 0 ? (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {accountingActive} aktif
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            Yok
          </span>
        )}
      </div>
    </div>
  );
}
