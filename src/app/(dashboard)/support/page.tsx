'use client';

import { useEffect, useState } from 'react';
import {
  Headphones,
  MessageCircle,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Package,
  Store,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';

type StoreOption = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string };

export default function SupportPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState('__none__');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [recentQuestions, setRecentQuestions] = useState<Array<{ id: string; questionText: string; answerText: string | null; status: string; createdAt: string }>>([]);

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          setStoreId(data[0].id);
        }
      })
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (!storeId) {
      setProducts([]);
      setProductId('__none__');
      return;
    }
    fetch(`/api/products?storeId=${storeId}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        const list = data?.products ?? [];
        setProducts(list);
        setProductId(list[0]?.id ?? '__none__');
      })
      .catch(() => setProducts([]));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/stores/${storeId}/questions?limit=10`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setRecentQuestions(data) : []))
      .catch(() => setRecentQuestions([]));
  }, [storeId]);

  const generateAnswer = () => {
    setError('');
    setAnswer('');
    if (!question.trim()) {
      setError('Soru metni girin');
      return;
    }
    setLoading(true);
    fetch('/api/ai/answer-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        productId: productId && productId !== '__none__' ? productId : undefined,
        question: question.trim(),
        platform: 'MANUAL',
        save: false,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAnswer(data.answer ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Cevap üretilemedi'))
      .finally(() => setLoading(false));
  };

  const saveQa = () => {
    if (!answer || !question.trim() || !storeId) return;
    setSaving(true);
    fetch('/api/ai/answer-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        productId: productId && productId !== '__none__' ? productId : undefined,
        question: question.trim(),
        answer: answer,
        platform: 'MANUAL',
        save: true,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRecentQuestions((prev) => [
          { id: data.id ?? '', questionText: question, answerText: answer, status: 'ANSWERED', createdAt: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      })
      .catch(() => setError('Kaydedilemedi'))
      .finally(() => setSaving(false));
  };

  const copyAnswer = () => {
    if (answer) {
      navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Destek</h1>
        <p className="text-muted-foreground">
          Pazaryeri müşteri sorularını ürün bilgisine göre cevaplayan AI asistan.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              AI Müşteri Asistanı
            </CardTitle>
            <CardDescription>
              Trendyol/Hepsiburada&apos;dan gelen veya manuel girdiğiniz soruları, ürün açıklamasına göre otomatik cevaplayın.
              OPENAI_API_KEY veya GEMINI_API_KEY gerekir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mağaza</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger>
                    <Store className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Mağaza seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ürün (opsiyonel – cevap bu ürün bilgisine göre üretilir)</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <Package className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Ürün seçin veya boş bırakın" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Genel cevap</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="question">Müşteri sorusu</Label>
              <textarea
                id="question"
                className="flex min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Örn: Bu ürün yıkanınca çeker mi? Kaç beden gelir?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={generateAnswer} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Cevap üret
              </Button>
              {answer && (
                <>
                  <Button variant="outline" size="sm" onClick={copyAnswer}>
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveQa} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kaydet
                  </Button>
                </>
              )}
            </div>
            {answer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border bg-muted/40 p-4"
              >
                <p className="text-sm font-medium text-muted-foreground mb-2">Cevap</p>
                <p className="text-sm whitespace-pre-wrap">{answer}</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son soru-cevaplar</CardTitle>
          <CardDescription>
            Kaydettiğiniz veya daha önce cevaplanan sorular (bu mağaza).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Henüz kayıt yok.</p>
          ) : (
            <ul className="space-y-3">
              {recentQuestions.map((q) => (
                <li key={q.id} className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground mb-1">&quot;{q.questionText.slice(0, 120)}{q.questionText.length > 120 ? '…' : ''}&quot;</p>
                  {q.answerText && (
                    <p className="text-foreground">{q.answerText.slice(0, 200)}{q.answerText.length > 200 ? '…' : ''}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
