import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12 MB

function sanitizeBaseName(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'xml-feed';
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const rawFile = form.get('file');
    if (!(rawFile instanceof File)) {
      return NextResponse.json({ error: 'Yüklenecek XML dosyası bulunamadı.' }, { status: 400 });
    }

    const file = rawFile;
    const isXmlName = file.name.toLowerCase().endsWith('.xml');
    const isXmlType =
      file.type === 'text/xml' || file.type === 'application/xml' || file.type === 'application/rss+xml';
    if (!isXmlName && !isXmlType) {
      return NextResponse.json({ error: 'Sadece XML dosyası yükleyin.' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Dosya boş olamaz.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Dosya boyutu 12 MB sınırını aşıyor.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const textStart = bytes.slice(0, 256).toString('utf8').trim().toLowerCase();
    if (!textStart.includes('<?xml') && !textStart.includes('<rss') && !textStart.includes('<feed') && !textStart.includes('<products')) {
      return NextResponse.json({ error: 'Dosya XML formatında görünmüyor.' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'xml');
    await mkdir(uploadDir, { recursive: true });

    const safeBase = sanitizeBaseName(file.name);
    const filename = `${Date.now()}-${safeBase}-${randomUUID().slice(0, 8)}.xml`;
    const fullPath = join(uploadDir, filename);
    await writeFile(fullPath, bytes);

    const url = `/uploads/xml/${filename}`;
    return NextResponse.json({
      ok: true,
      url,
      filename,
      size: file.size,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('xml upload error:', e);
    return NextResponse.json({ error: message || 'XML yükleme başarısız.' }, { status: 500 });
  }
}

