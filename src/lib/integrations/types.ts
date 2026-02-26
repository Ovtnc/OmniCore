/**
 * OmniCore - Integration Layer Types
 * Pazaryeri ve Muhasebe entegrasyonları için ortak tipler
 */

import type { MarketplacePlatform, AccountingProvider } from '@prisma/client';

// ============== COMMON ==============

export interface IntegrationCredentials {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  supplierId?: string;
  companyId?: string;
  clientId?: string;
  clientSecret?: string;
  [key: string]: string | undefined;
}

export interface RateLimitState {
  remaining: number;
  resetAt: Date;
  limit: number;
}

// ============== MARKETPLACE ==============

export interface MarketplaceProductPayload {
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  listPrice: number;
  salePrice: number;
  quantity: number;
  categoryId?: string;
  attributes?: Record<string, string>;
  images: string[];
  brand?: string;
  weight?: number;
}

export interface MarketplaceOrderPayload {
  orderId: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: Record<string, unknown>;
  items: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
    name: string;
  }>;
  subtotal: number;
  total: number;
  currency: string;
  rawPayload?: Record<string, unknown>;
}

export interface SyncProductResult {
  success: boolean;
  externalId?: string;
  externalSku?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface SyncOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface SyncStockResult {
  success: boolean;
  updatedCount?: number;
  error?: string;
}

// ============== ACCOUNTING / E-INVOICE ==============

export interface InvoiceLineItem {
  productCode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface InvoicePayload {
  customerTaxNumber?: string;
  customerTaxOffice?: string;
  customerName: string;
  customerAddress: string;
  customerCity?: string;
  customerCountry?: string;
  lines: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  orderId?: string;
  orderNumber?: string;
}

export interface SendInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceUuid?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface QueryInvoiceResult {
  success: boolean;
  status?: string;
  uuid?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}
