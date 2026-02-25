/**
 * Shopify Admin API adapter (stub – ileride REST/GraphQL product & orders)
 * https://shopify.dev/docs/api
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class ShopifyAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'SHOPIFY') {
    super(platform);
  }
}
