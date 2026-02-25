/**
 * XML'deki benzersiz etiketleri (keys) tespit eder - Dynamic Schema Discovery
 * POST body: { xmlUrl?: string, xmlContent?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Parse edilmiş XML'den ürün/item listesini çıkarır */
function extractItems(parsed: Record<string, unknown>): Record<string, unknown>[] {
  const products = parsed.products ?? parsed.catalog ?? parsed.feed;
  const root = parsed.root ?? parsed.channel;
  const fromProducts = products
    ? toArray(
        (products as Record<string, unknown>).product ??
          (products as Record<string, unknown>).item ??
          (products as Record<string, unknown>).urun
      )
    : [];
  const fromRoot = root
    ? toArray(
        (root as Record<string, unknown>).item ?? (root as Record<string, unknown>).product
      )
    : [];
  const direct = toArray(parsed.item ?? parsed.product);
  const raw = fromProducts.length ? fromProducts : fromRoot.length ? fromRoot : direct;
  return raw as Record<string, unknown>[];
}

/** Tek bir değeri kısa string örneğine çevirir */
function sampleValue(v: unknown, maxLen = 200): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.trim().slice(0, maxLen);
  if (Array.isArray(v)) {
    const first = v[0];
    if (first != null) return sampleValue(first, maxLen);
    return '';
  }
  if (typeof v === 'object' && v !== null && '#text' in v) {
    return sampleValue((v as { '#text': unknown })['#text'], maxLen);
  }
  return String(v).slice(0, maxLen);
}

/** Objeden tüm key'leri toplar (bir seviye derinlik; nested objeler nokta ile) */
function collectKeys(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('@_')) continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v) && !('#text' in v)) {
      const nested = v as Record<string, unknown>;
      if (Object.keys(nested).length === 1 && '#text' in nested) {
        keys.add(fullKey);
      } else {
        collectKeys(nested, fullKey).forEach((key) => keys.add(key));
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

/** İlk birkaç item'dan örnek değerler toplar */
function collectSampleValues(
  items: Record<string, unknown>[],
  tagSet: Set<string>,
  maxItems = 3
): Record<string, string> {
  const samples: Record<string, string> = {};
  const getVal = (obj: Record<string, unknown>, path: string): unknown => {
    const parts = path.split('.');
    let cur: unknown = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  };
  for (let i = 0; i < Math.min(maxItems, items.length); i++) {
    for (const tag of tagSet) {
      if (samples[tag]) continue;
      const v = getVal(items[i], tag);
      const s = sampleValue(v);
      if (s) samples[tag] = s;
    }
  }
  return samples;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let xmlUrl = typeof body.xmlUrl === 'string' ? body.xmlUrl.trim() : '';
    const xmlContent = typeof body.xmlContent === 'string' ? body.xmlContent : '';

    if (xmlUrl && xmlUrl.startsWith('/')) {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      xmlUrl = `${protocol}://${host}${xmlUrl}`;
    }

    let xmlText = xmlContent;
    if (!xmlText && xmlUrl) {
      const res = await fetch(xmlUrl, {
        headers: { Accept: 'application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `XML indirilemedi: ${res.status} ${res.statusText}` },
          { status: 400 }
        );
      }
      xmlText = await res.text();
    }
    if (!xmlText) {
      return NextResponse.json(
        { error: 'xmlUrl veya xmlContent gerekli' },
        { status: 400 }
      );
    }

    const parsed = parser.parse(xmlText) as Record<string, unknown>;
    const items = extractItems(parsed);
    if (items.length === 0) {
      return NextResponse.json({
        tags: [],
        sampleValues: {},
        itemCount: 0,
        message: 'XML\'de ürün/item elemanı bulunamadı.',
      });
    }

    const tagSet = new Set<string>();
    for (let i = 0; i < Math.min(5, items.length); i++) {
      collectKeys(items[i] as Record<string, unknown>).forEach((k) => tagSet.add(k));
    }
    const tags = Array.from(tagSet).sort();
    const sampleValues = collectSampleValues(items, tagSet);

    return NextResponse.json({
      tags,
      sampleValues,
      itemCount: items.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('analyze-tags error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
