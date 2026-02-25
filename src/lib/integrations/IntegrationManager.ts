/**
 * OmniCore - Integration Manager
 * Pazaryeri: @/services/marketplaces/factory (getMarketplaceAdapter) kullanır.
 * Tüm Prisma MarketplacePlatform enum değerleri factory üzerinden desteklenir;
 * bilinmeyen platformlar StubMarketplaceAdapter ile sarılır. Enum listesine burada
 * bağımlılık yok — dinamik yapı.
 * Muhasebe: yerel registry.
 */

import type { IntegrationCredentials } from './types';
import type { AccountingProvider } from '@prisma/client';
import { getMarketplaceAdapter } from '@/services/marketplaces';
import { AccountingIntegrationBase } from './base/AccountingIntegrationBase';
import { LogoAdapter } from './adapters/accounting/LogoAdapter';
import { ParasutAdapter } from './adapters/accounting/ParasutAdapter';

// ============== MARKETPLACE (factory delegasyonu) ==============

/** Health API için minimal arayüz; factory adapter'ı testConnection ile sarar */
export interface IMarketplaceIntegrationHealth {
  healthCheck(): Promise<boolean>;
}

/**
 * Pazaryeri entegrasyonu — platform adı factory'ye iletilir.
 * Prisma MarketplacePlatform enum değerleri (TRENDYOL, HEPSIBURADA, PAZARAMA, IDEFIX, …)
 * veya herhangi bir string kabul edilir; factory bilinmeyenler için StubMarketplaceAdapter döner.
 */
export function getMarketplaceIntegration(
  platform: string,
  _storeId: string,
  credentials: IntegrationCredentials,
  _rateLimit?: { remaining?: number; resetAt?: Date; limit?: number }
): IMarketplaceIntegrationHealth {
  const adapter = getMarketplaceAdapter(platform);
  const connection = {
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    sellerId: credentials.supplierId,
    supplierId: credentials.supplierId,
  };
  return {
    async healthCheck(): Promise<boolean> {
      const result = await adapter.testConnection(connection);
      return result.ok;
    },
  };
}

// ============== ACCOUNTING REGISTRY ==============

const accountingAdapters: Record<
  AccountingProvider,
  new (
    storeId: string,
    credentials: IntegrationCredentials,
    settings?: Record<string, unknown>
  ) => AccountingIntegrationBase
> = {
  LOGO: LogoAdapter,
  MIKRO: LogoAdapter,  // placeholder - MikroAdapter eklenebilir
  DIA: LogoAdapter,
  PARASUT: ParasutAdapter,
  BIZIMHESAP: LogoAdapter,
  TURKCELL_ESIRKET: LogoAdapter,
  LINK: LogoAdapter,
  ETA: LogoAdapter,
  OTHER: LogoAdapter,
};

export function getAccountingIntegration(
  provider: AccountingProvider,
  storeId: string,
  credentials: IntegrationCredentials,
  settings: Record<string, unknown> = {}
): AccountingIntegrationBase {
  const Adapter = accountingAdapters[provider] ?? accountingAdapters.OTHER;
  return new Adapter(storeId, credentials, settings);
}

export { AccountingIntegrationBase };
export type { IntegrationCredentials } from './types';
