/**
 * OmniCore - AI Kategori Eşleştirme
 * Ürün adı ve açıklamasından yola çıkarak (OpenAI veya Gemini ile)
 * verilen pazaryeri kategori listesinden en uygun kategori ID'sini tahmin eder.
 */

export interface CategoryOption {
  id: string;
  name: string;
  path?: string;
  /** Alt kategoriler (opsiyonel, ağaç yapısı için) */
  children?: CategoryOption[];
}

export interface MatchCategoryInput {
  productName: string;
  productDescription?: string;
  categories: CategoryOption[];
  /** "TRENDYOL" | "HEPSIBURADA" – prompt dilini/formatını ayarlamak için */
  platform?: string;
}

export interface MatchCategoryResult {
  categoryId: string;
  categoryName?: string;
  confidence?: number;
  rawResponse?: unknown;
}

/**
 * Kategori listesini düz liste olarak döndürür (ağaç yapısından flatten).
 */
function flattenCategories(cats: CategoryOption[], prefix = ''): Array<{ id: string; name: string; path: string }> {
  const out: Array<{ id: string; name: string; path: string }> = [];
  for (const c of cats) {
    const path = prefix ? `${prefix} > ${c.name}` : c.name;
    out.push({ id: c.id, name: c.name, path: c.path ?? path });
    if (c.children?.length) {
      out.push(...flattenCategories(c.children, path));
    }
  }
  return out;
}

/**
 * OpenAI Chat Completions API ile en uygun kategoriyi seçtirir.
 */
async function matchWithOpenAI(
  input: MatchCategoryInput,
  apiKey: string
): Promise<MatchCategoryResult> {
  const flat = flattenCategories(input.categories);
  const categoriesJson = JSON.stringify(
    flat.map((c) => ({ id: c.id, name: c.name, path: c.path })),
    null,
    2
  );

  const systemPrompt = `Sen bir e-ticaret kategori eşleştirme asistanısın. Verilen ürün adı ve açıklamasına göre, aşağıdaki kategori listesinden EN UYGUN TEK BİR kategori ID'sini seç. Sadece listedeki id değerlerinden birini döndür. Cevabında sadece JSON formatında şunu ver: {"categoryId": "<seçilen_id>", "categoryName": "<seçilen_kategori_adı>", "confidence": 0.0-1.0 arası sayı}`;

  const userPrompt = `Ürün adı: ${input.productName}${input.productDescription ? `\nAçıklama: ${input.productDescription.slice(0, 1500)}` : ''}\n\nKategori listesi (JSON):\n${categoriesJson}\n\nEn uygun kategori id'sini yukarıdaki formatta JSON olarak yaz.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API hatası ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as MatchCategoryResult) : null;
  if (!parsed?.categoryId) {
    throw new Error('OpenAI geçerli categoryId döndürmedi: ' + content);
  }
  const validId = flat.find((c) => c.id === parsed.categoryId || String(c.id) === String(parsed.categoryId));
  return {
    categoryId: validId?.id ?? parsed.categoryId,
    categoryName: parsed.categoryName ?? validId?.name,
    confidence: parsed.confidence,
    rawResponse: data,
  };
}

/**
 * Google Gemini API ile en uygun kategoriyi seçtirir.
 */
async function matchWithGemini(
  input: MatchCategoryInput,
  apiKey: string
): Promise<MatchCategoryResult> {
  const flat = flattenCategories(input.categories);
  const categoriesJson = JSON.stringify(
    flat.map((c) => ({ id: c.id, name: c.name, path: c.path })),
    null,
    2
  );

  const prompt = `E-ticaret kategori eşleştirme. Verilen ürün adı ve açıklamasına göre aşağıdaki kategori listesinden EN UYGUN TEK BİR kategori ID'sini seç. Sadece JSON döndür: {"categoryId": "<id>", "categoryName": "<ad>", "confidence": 0.0-1.0}\n\nÜrün adı: ${input.productName}${input.productDescription ? `\nAçıklama: ${input.productDescription.slice(0, 1500)}` : ''}\n\nKategori listesi:\n${categoriesJson}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 200,
      responseMimeType: 'application/json',
    },
  });
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 4000));
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  }
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) {
      throw new Error(
        'Gemini kota aşıldı. Biraz sonra tekrar deneyin veya OPENAI_API_KEY ile OpenAI kullanın.'
      );
    }
    throw new Error(`Gemini API hatası ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '{}';
  const parsed = JSON.parse(text) as MatchCategoryResult;
  if (!parsed?.categoryId) {
    throw new Error('Gemini geçerli categoryId döndürmedi: ' + text);
  }
  const validId = flat.find((c) => c.id === parsed.categoryId || String(c.id) === String(parsed.categoryId));
  return {
    categoryId: validId?.id ?? parsed.categoryId,
    categoryName: parsed.categoryName ?? validId?.name,
    confidence: parsed.confidence,
    rawResponse: data,
  };
}

/**
 * Ürün adı ve açıklamasından yola çıkarak verilen kategori listesinden
 * en uygun kategori ID'sini döndürür. OPENAI_API_KEY veya GEMINI_API_KEY ile çalışır.
 */
export async function matchCategory(input: MatchCategoryInput): Promise<MatchCategoryResult> {
  if (!input.categories?.length) {
    throw new Error('En az bir kategori gerekli');
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (openaiKey) {
    return matchWithOpenAI(input, openaiKey);
  }
  if (geminiKey) {
    return matchWithGemini(input, geminiKey);
  }

  throw new Error(
    'AI kategori eşleştirme için OPENAI_API_KEY veya GEMINI_API_KEY ortam değişkeni tanımlanmalı'
  );
}
