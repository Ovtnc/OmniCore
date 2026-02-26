/**
 * OmniCore merkezi tip tanımları.
 * API, Marketplace ve Product tipleri tek yerden export edilir.
 */

export type {
  PaginatedResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from './api';

export type {
  MarketplaceConnection,
  MarketplaceProduct,
} from '@/services/marketplaces/base.adapter';

export type {
  NormalizedOrderPayload,
  MappedListingError,
  RateLimitInfo,
  ImageRules,
  ListingStatusType,
} from '@/services/marketplaces/types';

export type { IntegrationCredentials } from '@/lib/integrations/types';
