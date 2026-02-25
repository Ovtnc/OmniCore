/**
 * OmniCore - Audit Log (İşlem kayıtları)
 * "Bu faturayı kim iptal etti?" / "Bu stok neden 0 oldu?" için her işlemi kaydedin.
 * Veri izolasyonu: storeId her zaman zorunlu; sorgularda filtre storeId ile yapılmalı.
 */

import { prisma } from '@/lib/prisma';

export type AuditAction =
  | 'CREATE_ORDER'
  | 'CANCEL_ORDER'
  | 'UPDATE_STOCK'
  | 'CANCEL_INVOICE'
  | 'SEND_INVOICE'
  | 'UPDATE_PRODUCT'
  | 'XML_IMPORT'
  | 'MARKETPLACE_SYNC'
  | 'QUESTION_ANSWERED'
  | string;

export interface AuditLogInput {
  storeId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        storeId: input.storeId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload as object | undefined,
        ip: input.ip,
      },
    });
  } catch (e) {
    console.error('Audit log create error:', e);
  }
}

/**
 * Veri izolasyonu: Tüm store-scoped sorgularda where: { storeId } kullanın.
 * Örnek: prisma.order.findMany({ where: { storeId } })
 */
export const DATA_ISOLATION_REMINDER = 'storeId';
