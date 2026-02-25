/**
 * XML import kuyruğuna iş ekler. Worker XML'i indirir, ürünleri DB'ye yazar ve
 * her ürün için marketplace-sync job'ı oluşturur (Trendyol vb. otomatik gönderim).
 */
import { NextResponse } from 'next/server';
import { addXmlImportJob } from '@/lib/queue';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await _req.json().catch(() => ({}));
    const xmlUrl = typeof body.xmlUrl === 'string' ? body.xmlUrl.trim() : '';
    const fieldMapping =
      typeof body.fieldMapping === 'object' && body.fieldMapping !== null
        ? (body.fieldMapping as Record<string, string>)
        : undefined;
    const variantMapping = Array.isArray(body.variantMapping)
      ? (body.variantMapping as Array<{ attributeKey: string; xmlTag: string }>)
      : undefined;
    const skipMarketplaceSync = body.skipMarketplaceSync === true;
    const selectiveImport = body.selectiveImport === true;

    if (!xmlUrl) {
      return NextResponse.json(
        { error: 'xmlUrl gerekli' },
        { status: 400 }
      );
    }

    const { jobId, batchId } = await addXmlImportJob(storeId, xmlUrl, {
      fieldMapping,
      variantMapping,
      skipMarketplaceSync,
      selectiveImport,
    });
    return NextResponse.json(batchId ? { jobId, batchId } : { jobId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
