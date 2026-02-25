/**
 * Amazon SP-API adapter (stub – ileride SP-API catalog/orders entegrasyonu)
 * https://developer-docs.amazon.com/sp-api/
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class AmazonAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'AMAZON') {
    super(platform);
  }
}
