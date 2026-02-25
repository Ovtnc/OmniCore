'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Link2,
  CheckCircle2,
  LayoutGrid,
  MapPin,
  Play,
  Loader2,
  AlertCircle,
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
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
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
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStores(data);
      })
      .catch(() => {});
  }, []);

  const handleTestConnection = async () => {
    if (!xmlUrl.trim()) return;
    setTestError('');
    setTestLoading(true);
    try {
      const res = await fetch('/api/xml/analyze-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlUrl: xmlUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bağlantı testi başarısız');
      setXmlTestOk(true);
      setXmlTags(data.tags || [], data.sampleValues || {}, data.itemCount || 0);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Test başarısız');
      setXmlTestOk(false);
    } finally {
      setTestLoading(false);
    }
  };

  const handleAnalyzeTags = async () => {
    if (!xmlUrl.trim()) return;
    setAnalyzeLoading(true);
    try {
      const res = await fetch('/api/xml/analyze-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlUrl: xmlUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analiz başarısız');
      setXmlTags(data.tags || [], data.sampleValues || {}, data.itemCount || 0);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Analiz başarısız');
    } finally {
      setAnalyzeLoading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">XML Kurulum Sihirbazı</h1>
        <p className="text-muted-foreground">
          Adım adım XML kaynağı, pazaryeri ve etiket eşleştirmesini yapıp içe aktarmayı başlatın.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={step >= 1 ? 'text-foreground font-medium' : ''}>1. Kaynak</span>
        <ChevronRight className="h-4 w-4" />
        <span className={step >= 2 ? 'text-foreground font-medium' : ''}>2. Pazaryeri</span>
        <ChevronRight className="h-4 w-4" />
        <span className={step >= 3 ? 'text-foreground font-medium' : ''}>3. Eşleştirme</span>
        <ChevronRight className="h-4 w-4" />
        <span className={step >= 4 ? 'text-foreground font-medium' : ''}>4. Onay</span>
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
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
            </div>
            {testError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {testError}
              </p>
            )}
            {xmlTestOk && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Bağlantı başarılı. {xmlTags.length} etiket, {itemCount} ürün tespit edildi.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleTestConnection} disabled={testLoading || !xmlUrl.trim()}>
                {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Bağlantıyı test et
              </Button>
              {xmlTestOk && (
                <Button variant="outline" onClick={() => setStep(2)}>
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
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={selectedPlatforms.includes(p.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedPlatforms(
                      selectedPlatforms.includes(p.value)
                        ? selectedPlatforms.filter((x) => x !== p.value)
                        : [...selectedPlatforms, p.value]
                    );
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Önceki
              </Button>
              <Button onClick={() => setStep(3)}>
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
          <div className="flex gap-2">
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
            <p className="text-sm text-muted-foreground">
              XML: {xmlUrl || '—'}. Eşleşen alan sayısı: {Object.keys(fieldMapping).filter((k) => fieldMapping[k]).length}.
              {hasVariants && ` Varyant: ${variantMapping.length} alan.`}
            </p>
            {submitMessage && (
              <p
                className={
                  submitMessage.type === 'success'
                    ? 'text-sm text-green-600'
                    : 'text-sm text-destructive'
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
