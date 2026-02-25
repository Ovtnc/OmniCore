/**
 * GET /api/proxy-image?url=...
 * Dış CDN görsellerini aynı-origin üzerinden sunar; CORS hatasını önler.
 * Sadece http(s) URL'lere izin verir; localhost ve özel IP'ler SSRF için reddedilir.
 */
import { NextResponse } from 'next/server';

function isUrlSafe(targetUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
  if (host === '[::1]') return false;
  const parts = host.replace(/^\[|\]$/g, '').split('.').map((p) => parseInt(p, 10));
  if (parts.length === 4 && !parts.some(Number.isNaN)) {
    if (parts[0] === 10) return false;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;
  }
  return true;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url')?.trim();
  if (!url || !isUrlSafe(url)) {
    return NextResponse.json({ error: 'Geçersiz veya izin verilmeyen URL' }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const contentType = res.headers.get('Content-Type') ?? 'image/jpeg';
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
