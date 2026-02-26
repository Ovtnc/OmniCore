'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Link2,
  Check,
  CheckCircle2,
  LayoutGrid,
  MapPin,
  Play,
  FileUp,
  Loader2,
  AlertCircle,
  Store,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BrandChip } from '@/components/ui/brand-chip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useXmlWizardStore } from '@/lib/xml-wizard-store';
import { Step3TagMapping } from '@/components/xml-wizard/step3-tag-mapping';

const PLATFORMS = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'GOOGLE_MERCHANT', label: 'Google Merchant' },
  { value: 'META_CATALOG', label: 'Meta Katalog' },
  { value: 'CIMRI', label: 'Cimri' },
  { value: 'AKAKCE', label: 'Akakçe' },
];

export default function XmlWizardPage() {
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [activeConnections, setActiveConnections] = useState<Array<{ id: string; platform: string }>>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadInfo, setUploadInfo] = useState<{ filename: string; size: number; url: string } | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectiveImport, setSelectiveImport] = useState(true);

  const {
    step,
    xmlUrl,
    xmlTestOk,
    xmlTags,
    itemCount,
    selectedPlatforms,
    fieldMapping,
    variantMapping,
    hasVariants,
    setStep,
    setXmlUrl,
    setXmlTestOk,
    setXmlTags,
    setSelectedPlatforms,
    reset,
  } = useXmlWizardStore();

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStores(data);
          if (!storeId && data.length > 0) {
            setStoreId(data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [storeId]);

  useEffect(() => {
    if (!storeId) {
      setActiveConnections([]);
      return;
    }
    setConnectionsLoading(true);
    fetch(`/api/stores/${storeId}/marketplace-connections`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setActiveConnections(
          rows
            .filter((c: { isActive?: boolean }) => c.isActive !== false)
            .map((c: { id: string; platform: string }) => ({ id: c.id, platform: c.platform }))
        );
      })
      .catch(() => setActiveConnections([]))
      .finally(() => setConnectionsLoading(false));
  }, [storeId]);

  const runAnalyze = async (source: { xmlUrl?: string; xmlContent?: string }) => {
    setTestError('');
    setUploadError('');
    setAnalyzeLoading(true);
    try {
      const res = await fetch('/api/xml/analyze-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bağlantı testi başarısız');
      setXmlTestOk(true);
      setXmlTags(data.tags || [], data.sampleValues || {}, data.itemCount || 0);
      return true;
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Test başarısız');
      setXmlTestOk(false);
      return false;
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!xmlUrl.trim()) return;
    setTestLoading(true);
    try {
      await runAnalyze({ xmlUrl: xmlUrl.trim() });
    } finally {
      setTestLoading(false);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedUploadFile) {
      setUploadError('Önce bir XML dosyası seçin.');
      return;
    }
    setUploadError('');
    setUploadInfo(null);
    setUploadLoading(true);
    try {
      const form = new FormData();
      form.append('file', selectedUploadFile);
      const uploadRes = await fetch('/api/xml/upload', {
        method: 'POST',
        body: form,
      });
      const uploaded = (await uploadRes.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        filename?: string;
        size?: number;
      };
      if (!uploadRes.ok || !uploaded.url) {
        throw new Error(uploaded.error || 'XML yüklenemedi');
      }
      setXmlUrl(uploaded.url);
      setUploadInfo({
        filename: uploaded.filename ?? selectedUploadFile.name,
        size: uploaded.size ?? selectedUploadFile.size,
        url: uploaded.url,
      });
      const ok = await runAnalyze({ xmlUrl: uploaded.url });
      if (!ok) {
        setUploadError('Dosya yüklendi ama tarama başarısız. URL ile tekrar test edebilirsiniz.');
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'XML yükleme başarısız');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleStartImport = async () => {
    if (!storeId || !xmlUrl.trim()) {
      setSubmitMessage({ type: 'error', text: 'Mağaza ve XML URL gerekli.' });
      return;
    }
    setSubmitMessage(null);
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/xml-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xmlUrl: xmlUrl.trim(),
          fieldMapping: Object.keys(fieldMapping).length ? fieldMapping : undefined,
          variantMapping: hasVariants && variantMapping.length ? variantMapping : undefined,
          skipMarketplaceSync: true,
          selectiveImport: selectiveImport,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İş başlatılamadı');
      const jobId = data.jobId as string;
      const batchId = data.batchId as string | undefined;
      setSubmitMessage({ type: 'success', text: 'İş kuyruğa alındı, ürünler işleniyor…' });
      const pollInterval = setInterval(async () => {
        try {
          const jRes = await fetch(`/api/jobs/${jobId}`);
          const j = await jRes.json();
          if (j.status === 'COMPLETED') {
            clearInterval(pollInterval);
            const r = (j.result as { total?: number; created?: number; updated?: number; batchId?: string }) ?? {};
            const bid = r.batchId ?? batchId;
            if (selectiveImport && bid) {
              window.location.href = `/xml-wizard/preview?batchId=${encodeURIComponent(bid)}`;
              return;
            }
            const total = r.total ?? 0;
            const created = r.created ?? 0;
            const updated = r.updated ?? 0;
            setSubmitMessage({
              type: 'success',
              text: `Ürünler eklendi. Toplam ${total} ürün (${created} yeni, ${updated} güncellendi). Ürünler sayfasından "Yüklemeyi başlat" ile pazaryerine gönderebilirsiniz.`,
            });
            setTimeout(() => { reset(); }, 8000);
          } else if (j.status === 'FAILED') {
            clearInterval(pollInterval);
            setSubmitMessage({ type: 'error', text: j.error || 'İş başarısız oldu.' });
          }
        } catch {
          // ignore poll errors
        }
      }, 2000);
      setTimeout(() => clearInterval(pollInterval), 120_000);
    } catch (e) {
      setSubmitMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'İş başlatılamadı',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Kaynak', desc: 'XML bağlantısı ve test' },
    { id: 2, title: 'Pazaryeri', desc: 'Hedef platform seçimi' },
    { id: 3, title: 'Eşleştirme', desc: 'Alan ve varyant map' },
    { id: 4, title: 'Onay', desc: 'Kuyruğa al ve başlat' },
  ];

  const completionPercent = ((step - 1) / (steps.length - 1)) * 100;
  const mappingCount = Object.keys(fieldMapping).filter((k) => fieldMapping[k]).length;
  const selectedPlatformList = useMemo(
    () =>
      Array.isArray(selectedPlatforms)
        ? selectedPlatforms.filter((p): p is string => typeof p === 'string')
        : [],
    [selectedPlatforms]
  );
  const activePlatformSet = new Set(activeConnections.map((c) => c.platform));
  const activePlatformKey = activeConnections.map((c) => c.platform).sort().join('|');
  const hasActiveConnections = activeConnections.length > 0;

  useEffect(() => {
    const filtered = selectedPlatformList.filter((p) => activePlatformSet.has(p));
    if (filtered.length !== selectedPlatformList.length) {
      setSelectedPlatforms(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, activePlatformKey, selectedPlatformList]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">XML Kurulum Sihirbazı</h1>
        <p className="text-muted-foreground">
          Adım adım XML kaynağı, pazaryeri ve etiket eşleştirmesini yapıp içe aktarmayı başlatın.
        </p>
        <div className="rounded-xl border bg-card/40 p-4">
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg border px-3 py-2 transition-colors ${
                  step === s.id
                    ? 'border-primary bg-primary/10'
                    : step > s.id
                      ? 'border-green-500/40 bg-green-500/10'
                      : 'border-border bg-background'
                }`}
              >
                <p className="text-xs text-muted-foreground">Adım {s.id}</p>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              XML Kaynağı
            </CardTitle>
            <CardDescription>
              XML feed URL&apos;sini girin ve bağlantıyı test edin. Başarılı olunca etiketler otomatik analiz edilir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-3">
                <Label htmlFor="xmlUrl">XML URL</Label>
                <Input
                  id="xmlUrl"
                  type="text"
                  placeholder="https://... veya /test-wizard-feed.xml"
                  value={xmlUrl}
                  onChange={(e) => setXmlUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Aynı sitedeki dosya için yol girin: <code className="bg-muted px-1 rounded">/test-wizard-feed.xml</code>
                </p>
                <div className="py-2">
                  <div className="relative my-2">
                    <div className="h-px w-full bg-border/70" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs font-medium text-muted-foreground">
                      veya
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      type="file"
                      accept=".xml,text/xml,application/xml,application/rss+xml"
                      onChange={(e) => setSelectedUploadFile(e.target.files?.[0] ?? null)}
                      className="sm:flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleUploadAndAnalyze}
                      disabled={uploadLoading || !selectedUploadFile}
                    >
                      {uploadLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                      Yükle ve Tara
                    </Button>
                  </div>
                  {uploadInfo && (
                    <p className="mt-2 text-xs text-green-600">
                      Yüklendi: {uploadInfo.filename} ({Math.max(1, Math.round(uploadInfo.size / 1024))} KB)
                    </p>
                  )}
                  {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
                </div>
              </div>
              <div className="h-fit rounded-lg border bg-muted/10 p-3 text-sm">
                <p className="font-medium">Kontrol listesi</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>XML URL herkesçe erişilebilir olmalı.</li>
                  <li>Feed içinde ürün düğümü tekrar etmeli.</li>
                  <li>Test sonrası etiket sayısı görünmeli.</li>
                </ul>
              </div>
            </div>
            {testError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {testError}
              </p>
            )}
            {xmlTestOk && (
              <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Bağlantı başarılı. {xmlTags.length} etiket, {itemCount} ürün tespit edildi.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleTestConnection} disabled={testLoading || analyzeLoading || !xmlUrl.trim()}>
                {testLoading || analyzeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Bağlantıyı test et
              </Button>
              <Badge variant="secondary" className="h-10 px-4 text-base font-semibold">
                Etiket: {xmlTags.length}
              </Badge>
              <Badge variant="secondary" className="h-10 px-4 text-base font-semibold">
                Ürün: {itemCount}
              </Badge>
              {xmlTestOk && (
                <Button variant="outline" className="ml-auto" onClick={() => setStep(2)}>
                  Sonraki: Pazaryeri
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Pazaryeri Seçimi
            </CardTitle>
            <CardDescription>
              Ürünlerin hangi platformlara yükleneceğini seçin (ileride kullanılacak).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-gradient-to-b from-primary/10 via-background to-background p-4 ring-1 ring-primary/20">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Setup Durumu</p>
                <Badge variant="secondary" className="h-7 px-2.5 text-xs">
                  {connectionsLoading ? 'Yükleniyor' : `${activePlatformSet.size} aktif bağlantı`}
                </Badge>
              </div>

              <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
                <div className="rounded-xl border bg-background/70 p-3">
                  <Label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Store className="h-3.5 w-3.5" />
                    Mağaza Seçimi
                  </Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Mağaza seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border bg-background/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Aktif Pazaryeri Bağlantıları
                  </p>
                  {connectionsLoading ? (
                    <div className="h-11 rounded-lg border border-dashed bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                      Bağlantılar yükleniyor...
                    </div>
                  ) : hasActiveConnections ? (
                    <div className="flex max-h-28 min-h-11 flex-wrap items-center gap-2 overflow-auto rounded-lg border bg-background/40 px-2 py-2">
                      {Array.from(new Set(activeConnections.map((c) => c.platform))).map((platform) => (
                        <span key={platform} className="rounded-full border bg-background px-2.5 py-1 text-xs shadow-sm">
                          <BrandChip code={platform} />
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Bu mağazada aktif pazaryeri bağlantısı yok.
                      </p>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/marketplace">Bağlantı Oluştur</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORMS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={selectedPlatformList.includes(p.value) ? 'default' : 'outline'}
                  className="h-14 justify-start gap-3"
                  disabled={!activePlatformSet.has(p.value)}
                  onClick={() => {
                    setSelectedPlatforms(
                      selectedPlatformList.includes(p.value)
                        ? selectedPlatformList.filter((x) => x !== p.value)
                        : [...selectedPlatformList, p.value]
                    );
                  }}
                >
                  <BrandChip code={p.value} label={p.label} logoClassName="h-5 w-5" />
                  {selectedPlatformList.includes(p.value) && (
                    <Check className="mr-1.5 h-4 w-4 shrink-0" />
                  )}
                </Button>
              ))}
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              Seçili platform: <span className="font-medium text-foreground">{selectedPlatformList.length}</span>
              {' · '}
              Şu an yalnızca kurulum bilgisi olarak kaydedilir; gönderim, ürün ekranındaki akıştan yapılır.
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Önceki
              </Button>
              <Button
                className="ml-auto"
                onClick={() => setStep(3)}
                disabled={!hasActiveConnections || selectedPlatformList.length === 0}
              >
                Sonraki: Etiket Eşleştirme
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <>
          <Step3TagMapping />
          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            Eşleşen ana alan: <span className="font-medium text-foreground">{mappingCount}</span>
            {hasVariants && (
              <>
                {' · '}Varyant eşleşmesi: <span className="font-medium text-foreground">{variantMapping.length}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Önceki
            </Button>
            <Button onClick={() => setStep(4)}>
              Sonraki: Onay ve Başlat
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Onay ve Başlat
            </CardTitle>
            <CardDescription>
              Mağaza seçin ve XML içe aktarmayı kuyruğa ekleyin. Eşleştirme kuralları işe uygulanacak.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-2">
                <Label>Mağaza</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Mağaza seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">Özet</p>
                <p className="mt-1 text-xs text-muted-foreground break-all">XML: {xmlUrl || '—'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Alan eşleşmesi: {mappingCount}
                  {hasVariants && ` · Varyant: ${variantMapping.length}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seçili platform: {selectedPlatformList.length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="selectiveImport"
                checked={selectiveImport}
                onChange={(e) => setSelectiveImport(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="selectiveImport" className="font-normal cursor-pointer">
                Ürün ön izleme ve seçimli kayıt (önce geçici listeye al, sonra seçtiklerimi aktar)
              </Label>
            </div>
            {submitMessage && (
              <p
                className={
                  submitMessage.type === 'success'
                    ? 'rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600'
                    : 'rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
                }
              >
                {submitMessage.text}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Önceki
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={submitLoading || !storeId || !xmlUrl.trim()}
              >
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Kuyruğa ekle ve başlat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="pt-4">
        <Button variant="ghost" asChild>
          <Link href="/tools">Araçlar sayfasına dön</Link>
        </Button>
      </div>
    </div>
  );
}
