/**
 * Platform adına göre doğru adapter sınıfını döndüren factory.
 * Prisma MarketplacePlatform enum ile uyumlu.
 */

import { MarketplaceAdapter } from './base.adapter';
import { TrendyolAdapter } from './trendyol.adapter';
import { HepsiburadaAdapter } from './hepsiburada.adapter';
import { AmazonAdapter } from './amazon.adapter';
import { N11Adapter } from './n11.adapter';
import { ShopifyAdapter } from './shopify.adapter';
import { CiceksepetiAdapter } from './ciceksepeti.adapter';
import { PazaramaAdapter } from './pazarama.adapter';
import { IdefixAdapter } from './idefix.adapter';
import { GoTurcAdapter } from './goturc.adapter';
import { PttavmAdapter } from './pttavm.adapter';
import { ModaNisaAdapter } from './modanisa.adapter';
import { AllesgoAdapter } from './allesgo.adapter';
import { StubMarketplaceAdapter } from './stub.adapter';

const ADAPTER_MAP: Record<string, () => MarketplaceAdapter> = {
  TRENDYOL: () => new TrendyolAdapter(),
  HEPSIBURADA: () => new HepsiburadaAdapter(),
  AMAZON: () => new AmazonAdapter('AMAZON'),
  N11: () => new N11Adapter('N11'),
  SHOPIFY: () => new ShopifyAdapter('SHOPIFY'),
  CICEKSEPETI: () => new CiceksepetiAdapter('CICEKSEPETI'),
  PAZARAMA: () => new PazaramaAdapter('PAZARAMA'),
  IDEFIX: () => new IdefixAdapter('IDEFIX'),
  GOTURC: () => new GoTurcAdapter('GOTURC'),
  PTTAVM: () => new PttavmAdapter('PTTAVM'),
  MODANISA: () => new ModaNisaAdapter('MODANISA'),
  ALLESGO: () => new AllesgoAdapter('ALLESGO'),
  WOOCOMMERCE: () => new StubMarketplaceAdapter('WOOCOMMERCE'),
  MAGENTO: () => new StubMarketplaceAdapter('MAGENTO'),
  CIMRI: () => new StubMarketplaceAdapter('CIMRI'),
  AKAKCE: () => new StubMarketplaceAdapter('AKAKCE'),
  GOOGLE_MERCHANT: () => new StubMarketplaceAdapter('GOOGLE_MERCHANT'),
  META_CATALOG: () => new StubMarketplaceAdapter('META_CATALOG'),
  GITTIGIDIYOR: () => new StubMarketplaceAdapter('GITTIGIDIYOR'),
  EPTTAA: () => new StubMarketplaceAdapter('EPTTAA'),
  MORHIPO: () => new StubMarketplaceAdapter('MORHIPO'),
  OTHER: () => new StubMarketplaceAdapter('OTHER'),
};

/**
 * Platform string'ine göre adapter örneği döner.
 */
export function getMarketplaceAdapter(platform: string): MarketplaceAdapter {
  const key = platform.toUpperCase().replace(/\s/g, '');
  const factory = ADAPTER_MAP[key];
  if (factory) return factory();
  return new StubMarketplaceAdapter(platform);
}
