/**
 * OmniCore - Abstract Accounting / E-Fatura Integration Manager
 * Adapter Pattern: Logo, Mikro, DİA, Paraşüt, Bizimhesap, Turkcell e-Şirket vb.
 */

import type {
  IntegrationCredentials,
  InvoicePayload,
  SendInvoiceResult,
  QueryInvoiceResult,
} from '../types';
import type { AccountingProvider } from '@prisma/client';

export abstract class AccountingIntegrationBase {
  abstract readonly provider: AccountingProvider;
  protected credentials: IntegrationCredentials;
  protected storeId: string;
  protected settings: Record<string, unknown>;

  constructor(
    storeId: string,
    credentials: IntegrationCredentials,
    settings: Record<string, unknown> = {}
  ) {
    this.storeId = storeId;
    this.credentials = credentials;
    this.settings = settings;
  }

  /** Fatura verisini sağlayıcı formatına çevir */
  protected abstract mapInvoiceToProviderFormat(
    payload: InvoicePayload
  ): Record<string, unknown>;

  /** E-fatura / e-arşiv gönder */
  abstract sendInvoice(payload: InvoicePayload): Promise<SendInvoiceResult>;

  /** Fatura durumu sorgula */
  abstract queryInvoice(invoiceIdOrUuid: string): Promise<QueryInvoiceResult>;

  /** Bağlantı / yetki testi */
  abstract healthCheck(): Promise<boolean>;
}
