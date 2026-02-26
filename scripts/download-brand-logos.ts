import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

type EnumName = 'MarketplacePlatform' | 'AccountingProvider' | 'PaymentProvider' | 'CargoProvider';

type BrandEntry = {
  code: string;
  enumName: EnumName;
  label: string;
  domain?: string;
};

const ENUMS: EnumName[] = [
  'MarketplacePlatform',
  'AccountingProvider',
  'PaymentProvider',
  'CargoProvider',
];
const execFileAsync = promisify(execFile);

const LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON: 'Amazon',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce',
  MAGENTO: 'Magento',
  CIMRI: 'Cimri',
  AKAKCE: 'Akakce',
  GOOGLE_MERCHANT: 'Google Merchant',
  META_CATALOG: 'Meta',
  GITTIGIDIYOR: 'GittiGidiyor',
  EPTTAA: 'ePttAVM',
  CICEKSEPETI: 'Ciceksepeti',
  MORHIPO: 'Morhipo',
  PAZARAMA: 'Pazarama',
  IDEFIX: 'Idefix',
  GOTURC: 'GoTurc',
  PTTAVM: 'PTTAVM',
  MODANISA: 'Modanisa',
  ALLESGO: 'Allesgo',
  LOGO: 'Logo',
  MIKRO: 'Mikro',
  DIA: 'Dia',
  PARASUT: 'Parasut',
  BIZIMHESAP: 'BizimHesap',
  TURKCELL_ESIRKET: 'Turkcell E-Sirket',
  LINK: 'Link',
  ETA: 'Eta',
  PAYTR: 'PayTR',
  IYZICO: 'iyzico',
  CARI_HAVALE: 'Cari Havale',
  BANK_TRANSFER: 'Banka Havalesi',
  YURTICI: 'Yurtici Kargo',
  ARAS: 'Aras Kargo',
  MNG: 'MNG Kargo',
  PTT: 'PTT Kargo',
  SURAT: 'Surat Kargo',
  HOROZ: 'Horoz Lojistik',
};

const DOMAINS: Record<string, string> = {
  TRENDYOL: 'trendyol.com',
  HEPSIBURADA: 'hepsiburada.com',
  AMAZON: 'amazon.com',
  N11: 'n11.com',
  SHOPIFY: 'shopify.com',
  WOOCOMMERCE: 'woocommerce.com',
  MAGENTO: 'magento.com',
  CIMRI: 'cimri.com',
  AKAKCE: 'akakce.com',
  GOOGLE_MERCHANT: 'google.com',
  META_CATALOG: 'meta.com',
  GITTIGIDIYOR: 'gittigidiyor.com',
  EPTTAA: 'pttavm.com',
  CICEKSEPETI: 'ciceksepeti.com',
  MORHIPO: 'morhipo.com',
  PAZARAMA: 'pazarama.com',
  IDEFIX: 'idefix.com',
  GOTURC: 'goturc.com',
  PTTAVM: 'pttavm.com',
  MODANISA: 'modanisa.com',
  ALLESGO: 'allesgo.com',
  LOGO: 'logo.com.tr',
  MIKRO: 'mikro.com.tr',
  DIA: 'dia.com.tr',
  PARASUT: 'parasut.com',
  BIZIMHESAP: 'bizimhesap.com',
  TURKCELL_ESIRKET: 'turkcell.com.tr',
  LINK: 'link.com.tr',
  ETA: 'eta.com.tr',
  PAYTR: 'paytr.com',
  IYZICO: 'iyzico.com',
  CARI_HAVALE: 'tr.wikipedia.org',
  BANK_TRANSFER: 'tr.wikipedia.org',
  YURTICI: 'yurticikargo.com',
  ARAS: 'araskargo.com.tr',
  MNG: 'mngkargo.com.tr',
  PTT: 'ptt.gov.tr',
  SURAT: 'suratkargo.com.tr',
  HOROZ: 'horoz.com.tr',
};

function parseEnumValues(schema: string, enumName: EnumName): string[] {
  const rx = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = schema.match(rx);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('//'))
    .map((line) => line.split(/\s+/)[0])
    .filter((value) => value !== 'OTHER');
}

function toBrandEntries(schema: string): BrandEntry[] {
  const list: BrandEntry[] = [];
  for (const enumName of ENUMS) {
    const codes = parseEnumValues(schema, enumName);
    for (const code of codes) {
      list.push({
        code,
        enumName,
        label: LABELS[code] ?? code,
        domain: DOMAINS[code],
      });
    }
  }
  return list;
}

function getLogoUrls(domain: string): string[] {
  return [
    `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=256&format=png`,
    `https://www.google.com/s2/favicons?sz=256&domain=${encodeURIComponent(domain)}`,
    `https://logo.clearbit.com/${encodeURIComponent(domain)}`,
  ];
}

async function downloadWithFetch(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 OmniCoreLogoFetcher/1.0',
      Accept: 'image/png,image/*;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length < 64) throw new Error('Cok kucuk dosya');
  return buf;
}

async function downloadWithCurl(url: string): Promise<Buffer> {
  const { stdout } = await execFileAsync('curl', [
    '-fsSL',
    '--max-time',
    '20',
    '-A',
    'Mozilla/5.0 OmniCoreLogoFetcher/1.0',
    url,
  ], {
    encoding: 'buffer',
    maxBuffer: 5 * 1024 * 1024,
  });
  const buf = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout as unknown as Uint8Array);
  if (buf.length < 64) throw new Error('Cok kucuk dosya');
  return buf;
}

async function downloadLogo(domain: string): Promise<{ buffer: Buffer; source: string }> {
  const urls = getLogoUrls(domain);
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const buffer = await downloadWithFetch(url);
      return { buffer, source: `fetch:${url}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`fetch ${url} -> ${msg}`);
    }
    try {
      const buffer = await downloadWithCurl(url);
      return { buffer, source: `curl:${url}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`curl ${url} -> ${msg}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function downloadGenericFallback(): Promise<{ buffer: Buffer; source: string }> {
  const fallbackUrl = 'https://www.google.com/s2/favicons?sz=256&domain=wikipedia.org';
  try {
    const buffer = await downloadWithFetch(fallbackUrl);
    return { buffer, source: `fallback:${fallbackUrl}` };
  } catch {
    const buffer = await downloadWithCurl(fallbackUrl);
    return { buffer, source: `fallback-curl:${fallbackUrl}` };
  }
}

async function main() {
  const root = process.cwd();
  const schemaPath = join(root, 'prisma', 'schema.prisma');
  const outDir = join(root, 'public', 'brand-logos');
  await mkdir(outDir, { recursive: true });

  const schema = await readFile(schemaPath, 'utf8');
  const entries = toBrandEntries(schema);

  const report: Array<Record<string, string>> = [];

  for (const brand of entries) {
    const outFile = join(outDir, `${brand.code}.png`);
    if (!brand.domain) {
      report.push({
        code: brand.code,
        label: brand.label,
        enumName: brand.enumName,
        status: 'skipped',
        reason: 'domain yok',
      });
      continue;
    }
    try {
      const result = await downloadLogo(brand.domain);
      await writeFile(outFile, result.buffer);
      report.push({
        code: brand.code,
        label: brand.label,
        enumName: brand.enumName,
        status: 'ok',
        domain: brand.domain,
        file: `/brand-logos/${brand.code}.png`,
        source: result.source,
      });
      console.log(`[ok] ${brand.code} -> ${brand.domain} (${result.source})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      try {
        const fallback = await downloadGenericFallback();
        await writeFile(outFile, fallback.buffer);
        report.push({
          code: brand.code,
          label: brand.label,
          enumName: brand.enumName,
          status: 'placeholder',
          domain: brand.domain,
          file: `/brand-logos/${brand.code}.png`,
          source: fallback.source,
          reason: msg,
        });
        console.warn(`[warn] ${brand.code} -> ${brand.domain}: logo yok, placeholder yazildi`);
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        report.push({
          code: brand.code,
          label: brand.label,
          enumName: brand.enumName,
          status: 'error',
          domain: brand.domain,
          reason: `${msg} | fallback: ${fallbackMsg}`,
        });
        console.error(`[err] ${brand.code} -> ${brand.domain}: ${msg}`);
      }
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    total: entries.length,
    items: report,
  };
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const okCount = report.filter((r) => r.status === 'ok').length;
  const placeholderCount = report.filter((r) => r.status === 'placeholder').length;
  const errCount = report.filter((r) => r.status === 'error').length;
  const skipCount = report.filter((r) => r.status === 'skipped').length;
  console.log(`\nTamamlandı. ok=${okCount} placeholder=${placeholderCount} error=${errCount} skipped=${skipCount}`);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  process.exit(1);
});
