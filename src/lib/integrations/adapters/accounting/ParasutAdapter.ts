/**
 * Paraşüt E-Fatura / Muhasebe Adapter
 */

import { AccountingIntegrationBase } from '../../base/AccountingIntegrationBase';
import type {
  InvoicePayload,
  SendInvoiceResult,
  QueryInvoiceResult,
} from '../../types';
import { AccountingProvider } from '@prisma/client';

export class ParasutAdapter extends AccountingIntegrationBase {
  readonly provider = AccountingProvider.PARASUT;

  protected mapInvoiceToProviderFormat(
    payload: InvoicePayload
  ): Record<string, unknown> {
    return {
      contact: {
        name: payload.customerName,
        tax_number: payload.customerTaxNumber,
        tax_office: payload.customerTaxOffice,
        address: payload.customerAddress,
        city: payload.customerCity,
        country: payload.customerCountry ?? 'TR',
      },
      details: payload.lines.map((line) => ({
        product_code: line.productCode,
        description: line.name,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        vat_rate: line.taxRate,
        total: line.total,
      })),
      subtotal: payload.subtotal,
      total_vat: payload.taxTotal,
      grand_total: payload.total,
      currency: payload.currency,
      invoice_series: (this.settings.invoiceSeries as string) ?? 'A',
      invoice_no: payload.orderNumber,
    };
  }

  async sendInvoice(payload: InvoicePayload): Promise<SendInvoiceResult> {
    try {
      const body = this.mapInvoiceToProviderFormat(payload);
      // TODO: Paraşüt API e-fatura
      return {
        success: true,
        invoiceId: `parasut-${Date.now()}`,
        invoiceUuid: `uuid-${Date.now()}`,
        rawResponse: { body },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Paraşüt e-fatura error',
      };
    }
  }

  async queryInvoice(invoiceIdOrUuid: string): Promise<QueryInvoiceResult> {
    try {
      return { success: true, status: 'SENT', uuid: invoiceIdOrUuid };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Paraşüt query error',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
