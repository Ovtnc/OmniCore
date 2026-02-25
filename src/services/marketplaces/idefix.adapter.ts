/**
 * İdefix API adapter (stub – ileride entegrasyon)
 */

import { StubMarketplaceAdapter } from './stub.adapter';

export class IdefixAdapter extends StubMarketplaceAdapter {
  constructor(platform: string = 'IDEFIX') {
    super(platform);
  }
}
