/**
 * Logo Tiger / Logo E-Fatura Adapter
 * Adapter pattern: Muhasebe ve e-fatura entegrasyonu
 */

import { AccountingIntegrationBase } from '../../base/AccountingIntegrationBase';
import type {
  InvoicePayload,
  SendInvoiceResult,
  QueryInvoiceResult,
} from '../../types';
import { AccountingProvider } from '@prisma/client';

export class LogoAdapter extends AccountingIntegrationBase {
  readonly provider = AccountingProvider.LOGO;

  protected mapInvoiceToProviderFormat(
    payload: InvoicePayload
  ): Record<string, unknown> {
    return {
      cariKod: payload.customerTaxNumber ?? payload.customerName,
      unvan: payload.customerName,
      adres: payload.customerAddress,
      vergiDairesi: payload.customerTaxOffice,
      vergiNo: payload.customerTaxNumber,
      satirlar: payload.lines.map((line) => ({
        stokKodu: line.productCode,
        aciklama: line.name,
        miktar: line.quantity,
        birimFiyat: line.unitPrice,
        kdvOrani: line.taxRate,
        kdvTutar: line.taxAmount,
        toplam: line.total,
      })),
      araToplam: payload.subtotal,
      kdvToplam: payload.taxTotal,
      genelToplam: payload.total,
      doviz: payload.currency,
      siparisNo: payload.orderNumber,
    };
  }

  async sendInvoice(payload: InvoicePayload): Promise<SendInvoiceResult> {
    try {
      const body = this.mapInvoiceToProviderFormat(payload);
      // TODO: Logo API (Tiger/Go) e-fatura gönderimi
      return {
        success: true,
        invoiceId: `logo-${Date.now()}`,
        invoiceUuid: `uuid-${Date.now()}`,
        rawResponse: { body },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Logo e-fatura error',
      };
    }
  }

  async queryInvoice(invoiceIdOrUuid: string): Promise<QueryInvoiceResult> {
    try {
      // TODO: Logo fatura sorgulama
      return {
        success: true,
        status: 'ACCEPTED',
        uuid: invoiceIdOrUuid,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Logo query error',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    // TODO: Logo API bağlantı testi
    return true;
  }
}
