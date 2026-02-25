'use client';

import { useEffect, useState } from 'react';
import {
  Wrench,
  FileCode2,
  Play,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Store,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const JOB_TYPE_LABEL: Record<string, string> = {
  XML_GENERATE: 'XML Import',
  MARKETPLACE_SYNC_PRODUCT: 'Pazaryeri ürün sync',
  MARKETPLACE_SYNC_ORDER: 'Pazaryeri sipariş sync',
  MARKETPLACE_SYNC_STOCK: 'Pazaryeri stok sync',
  EINVOICE_SEND: 'E-Fatura gönder',
  EINVOICE_QUERY: 'E-Fatura sorgula',
  ACCOUNTING_SYNC: 'Muhasebe sync',
  SMS_SEND: 'SMS',
  EMAIL_SEND: 'E-posta',
  CARGO_CREATE: 'Kargo',
  AI_CATEGORY_MATCH: 'AI kategori eşleştirme',
  AI_QA_RESPONSE: 'AI yanıt',
};

const JOB_STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  PENDING: { label: 'Bekliyor', icon: Clock, className: 'text-muted-foreground' },
  ACTIVE: { label: 'Çalışıyor', icon: Loader2, className: 'text-blue-600 dark:text-blue-400' },
  COMPLETED: { label: 'Tamamlandı', icon: CheckCircle2, className: 'text-green-600 dark:text-green-400' },
  FAILED: { label: 'Başarısız', icon: XCircle, className: 'text-destructive' },
  CANCELLED: { label: 'İptal', icon: AlertCircle, className: 'text-muted-foreground' },
};

type StoreOption = { id: string; name: string; slug: string };
type Job = {
  id: string;
  storeId: string;
  type: string;
  status: string;
  payload: unknown;
  result: unknown;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  store: { name: string; slug: string };
};

export default function ToolsPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [xmlUrl, setXmlUrl] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categorySource, setCategorySource] = useState<'store' | 'trendyol'>('trendyol');
  const [categoryStoreId, setCategoryStoreId] = useState('');
  const [categoryResult, setCategoryResult] = useState<{
    categoryId: string;
    categoryName?: string;
    confidence?: number;
  } | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          setStoreId(data[0].id);
          setCategoryStoreId(data[0].id);
        }
      })
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, []);

  const fetchJobs = () => {
    setLoadingJobs(true);
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setJobs(data) : setJobs([])))
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  };

  useEffect(() => {
    fetchJobs();
    const t = setInterval(fetchJobs, 8000);
    return () => clearInterval(t);
  }, []);

  const handleXmlImport = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!storeId || !xmlUrl.trim()) {
      setMessage({ type: 'error', text: 'Mağaza ve XML URL gerekli' });
      return;
    }
    setSubmitting(true);
    fetch(`/api/stores/${storeId}/xml-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xmlUrl: xmlUrl.trim() }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(d?.error ?? 'Hata'));
        return r.json();
      })
      .then((data: { jobId: string }) => {
        setMessage({
          type: 'success',
          text: `İş oluşturuldu. Job ID: ${data.jobId}. Worker çalışıyorsa ürünler işlenecek.`,
        });
        setXmlUrl('');
        fetchJobs();
      })
      .catch((err) =>
        setMessage({ type: 'error', text: typeof err === 'string' ? err : err?.error ?? 'İş başlatılamadı' })
      )
      .finally(() => setSubmitting(false));
  };

  const handleMatchCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    setCategoryResult(null);
    if (!categoryName.trim()) {
      setCategoryError('Ürün adı girin');
      return;
    }
    if (categorySource === 'store' && !categoryStoreId) {
      setCategoryError('Mağaza seçin');
      return;
    }
    setCategoryLoading(true);
    fetch('/api/ai/match-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: categoryName.trim(),
        productDescription: categoryDesc.trim() || undefined,
        storeId: categorySource === 'store' ? categoryStoreId : undefined,
        platform: categorySource === 'trendyol' ? 'TRENDYOL' : undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCategoryResult({
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          confidence: data.confidence,
        });
      })
      .catch((err) => setCategoryError(err instanceof Error ? err.message : 'Eşleştirme başarısız'))
      .finally(() => setCategoryLoading(false));
  };

  const formatDate = (s: string | null) => {
    if (!s) return '–';
    const d = new Date(s);
    return d.toLocaleString('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Araçlar</h1>
        <p className="text-muted-foreground">
          XML import, toplu işlem ve arka plan işlerini buradan başlatıp takip edin.
        </p>
      </div>

      {/* XML Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            XML Import
          </CardTitle>
          <CardDescription>
            XML feed URL&apos;sini girin. Ürünler veritabanına yazılır ve her biri pazaryeri sync kuyruğuna eklenir.
            Worker çalışıyor olmalı: <code className="rounded bg-muted px-1 text-xs">pnpm run queue:dev</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleXmlImport} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mağaza</Label>
                <Select
                  value={storeId}
                  onValueChange={setStoreId}
                  disabled={loadingStores || stores.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={stores.length === 0 ? 'Mağaza yok' : 'Seçin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <Store className="h-3.5 w-3.5" />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xmlUrl">XML URL</Label>
                <Input
                  id="xmlUrl"
                  type="url"
                  value={xmlUrl}
                  onChange={(e) => setXmlUrl(e.target.value)}
                  placeholder="https://... veya http://localhost:3000/test-feed.xml"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={submitting || !storeId || !xmlUrl.trim()}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Import başlat
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setXmlUrl('http://localhost:3000/test-feed.xml')}
              >
                Test feed kullan
              </Button>
            </div>
            {message && (
              <p
                className={
                  message.type === 'success'
                    ? 'text-sm text-green-600 dark:text-green-400'
                    : 'text-sm text-destructive'
                }
              >
                {message.text}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* AI Kategori Eşleştirme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Kategori Eşleştirme
          </CardTitle>
          <CardDescription>
            XML veya katalogdan gelen ürün adı/açıklamasına göre mağaza veya Trendyol kategorisi önerir.
            OPENAI_API_KEY veya GEMINI_API_KEY gerekli.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMatchCategory} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="categoryName">Ürün adı</Label>
                <Input
                  id="categoryName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Örn: Erkek Slim Fit Gömlek"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="categoryDesc">Açıklama (opsiyonel)</Label>
                <Input
                  id="categoryDesc"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="Kısa ürün açıklaması"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori kaynağı</Label>
                <Select
                  value={categorySource}
                  onValueChange={(v: 'store' | 'trendyol') => setCategorySource(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trendyol">Trendyol (örnek kategoriler)</SelectItem>
                    <SelectItem value="store">Mağaza kategorileri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {categorySource === 'store' && (
                <div className="space-y-2">
                  <Label>Mağaza</Label>
                  <Select
                    value={categoryStoreId}
                    onValueChange={setCategoryStoreId}
                    disabled={loadingStores || stores.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={stores.length === 0 ? 'Mağaza yok' : 'Seçin'} />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {categoryError && (
              <p className="text-sm text-destructive">{categoryError}</p>
            )}
            {categoryResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3">
                  <Tag className="h-5 w-5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {categoryResult.categoryName ?? categoryResult.categoryId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {categoryResult.categoryId}
                      {categoryResult.confidence != null && (
                        <> · Güven: %{Math.round(categoryResult.confidence * 100)}</>
                      )}
                    </p>
                  </div>
                </div>
                {categoryResult.confidence != null && categoryResult.confidence < 0.85 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const sid = categorySource === 'store' ? categoryStoreId : stores[0]?.id;
                      if (!sid) return;
                      fetch('/api/ai/category-suggestions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          storeId: sid,
                          productName: categoryName.trim(),
                          productDescription: categoryDesc.trim() || undefined,
                          platform: categorySource === 'trendyol' ? 'TRENDYOL' : 'TRENDYOL',
                          suggestedCategoryId: categoryResult.categoryId,
                          suggestedCategoryName: categoryResult.categoryName,
                          confidence: categoryResult.confidence,
                        }),
                      }).then(() => setMessage({ type: 'success', text: 'Onay listesine eklendi. Dashboard\'dan inceleyebilirsiniz.' }));
                    }}
                  >
                    Onaya gönder (düşük güven)
                  </Button>
                )}
              </div>
            )}
            <Button type="submit" disabled={categoryLoading}>
              {categoryLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Eşleştir
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Son işler */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Son işler</CardTitle>
            <CardDescription>
              XML import ve diğer arka plan işleri. Durum otomatik güncellenir.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loadingJobs}>
            <RefreshCw className={`h-4 w-4 ${loadingJobs ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.some((j) => j.status === 'PENDING') && (
            <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <strong>Bekleyen işler var.</strong> İşlerin işlenmesi için ayrı bir terminalde worker&apos;ı çalıştırın:{' '}
              <code className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs">pnpm run queue:dev</code>
              {' '}(Redis çalışıyor olmalı: <code className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs">docker compose up -d</code>)
            </div>
          )}
          {loadingJobs && jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
          ) : jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Henüz iş yok.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Tarih</th>
                    <th className="px-4 py-2 text-left font-medium">Tür</th>
                    <th className="px-4 py-2 text-left font-medium">Mağaza</th>
                    <th className="px-4 py-2 text-left font-medium">Durum</th>
                    <th className="px-4 py-2 text-left font-medium">Sonuç / Hata</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const statusConfig = JOB_STATUS_CONFIG[job.status] ?? {
                      label: job.status,
                      icon: Clock,
                      className: 'text-muted-foreground',
                    };
                    const StatusIcon = statusConfig.icon;
                    const resultPayload =
                      job.result && typeof job.result === 'object' && 'total' in job.result
                        ? (job.result as { total?: number; queued?: number; failed?: number })
                        : null;
                    return (
                      <tr key={job.id} className="border-b last:border-0">
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="px-4 py-2">
                          {JOB_TYPE_LABEL[job.type] ?? job.type}
                        </td>
                        <td className="px-4 py-2">{job.store.name}</td>
                        <td className="px-4 py-2">
                          <span className={`flex items-center gap-1.5 ${statusConfig.className}`}>
                            {job.status === 'ACTIVE' && (
                              <StatusIcon className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {job.status !== 'ACTIVE' && <StatusIcon className="h-3.5 w-3.5" />}
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="max-w-[240px] truncate px-4 py-2 text-muted-foreground">
                          {job.error && (
                            <span className="text-destructive" title={job.error}>
                              {job.error}
                            </span>
                          )}
                          {!job.error && resultPayload && (
                            <span>
                              {resultPayload.total != null && `${resultPayload.total} ürün`}
                              {resultPayload.queued != null && `, ${resultPayload.queued} kuyruğa atıldı`}
                              {resultPayload.failed != null && resultPayload.failed > 0 && (
                                <span className="text-destructive">, {resultPayload.failed} hata</span>
                              )}
                            </span>
                          )}
                          {!job.error && !resultPayload && job.result != null && (
                            <span title={JSON.stringify(job.result)}>Tamamlandı</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
