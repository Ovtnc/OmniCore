/**
 * Çiçeksepeti API adapter (stub – ileride satıcı API entegrasyonu)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class CiceksepetiAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'CICEKSEPETI') {
    super(platform);
  }
}
