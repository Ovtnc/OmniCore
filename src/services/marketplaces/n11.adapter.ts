/**
 * N11 API adapter (stub – ileride N11 Open API)
 * https://developer.n11.com/
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class N11Adapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'N11') {
    super(platform);
  }
}
