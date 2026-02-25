/**
 * OmniCore - AI Müşteri Soru-Cevap
 * Ürün bilgisine göre pazaryeri müşteri sorularını (Trendyol/Hepsiburada vb.) cevaplar.
 * OPENAI_API_KEY veya GEMINI_API_KEY gerekir.
 */

export interface AnswerQuestionInput {
  question: string;
  productName?: string;
  productDescription?: string;
  /** Ürün özellikleri (beden, renk vb.) */
  productAttributes?: Record<string, string>;
  platform?: string;
}

export interface AnswerQuestionResult {
  answer: string;
  model?: string;
}

const SYSTEM_PROMPT = `Sen bir e-ticaret müşteri hizmetleri asistanısın. Müşteri sorularını, verilen ürün bilgisine dayanarak kısa, nazik ve bilgilendirici şekilde cevaplıyorsun.
Kurallar:
- Sadece ürün bilgisinde olan şeyleri söyle; uydurma.
- Cevabı 2-4 cümle ile sınırla.
- Türkçe, samimi ve profesyonel dil kullan.
- Fiyat/kampanya bilgisi verilmediyse "Fiyat ve kampanya bilgisi için mağaza sayfasını kontrol edebilirsiniz" gibi yönlendir.
- Cevabında sadece metin olsun, başlık veya "Cevap:" ekleme.`;

async function answerWithOpenAI(
  input: AnswerQuestionInput,
  apiKey: string
): Promise<AnswerQuestionResult> {
  const context = [
    input.productName && `Ürün adı: ${input.productName}`,
    input.productDescription && `Açıklama: ${input.productDescription.slice(0, 2000)}`,
    input.productAttributes &&
      Object.keys(input.productAttributes).length > 0 &&
      `Özellikler: ${JSON.stringify(input.productAttributes)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const userContent = context
    ? `Ürün bilgisi:\n${context}\n\nMüşteri sorusu: ${input.question}\n\nYukarıdaki bilgiye göre cevabı yaz (sadece cevap metni):`
    : `Müşteri sorusu: ${input.question}\n\nGenel bir e-ticaret müşteri hizmetleri cevabı yaz (ürün bilgisi yok, kısa ve nazik olsun):`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API hatası ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const answer = data.choices?.[0]?.message?.content?.trim() ?? '';
  return { answer, model: data.model };
}

async function answerWithGemini(
  input: AnswerQuestionInput,
  apiKey: string
): Promise<AnswerQuestionResult> {
  const context = [
    input.productName && `Ürün adı: ${input.productName}`,
    input.productDescription && `Açıklama: ${input.productDescription.slice(0, 2000)}`,
    input.productAttributes &&
      Object.keys(input.productAttributes).length > 0 &&
      `Özellikler: ${JSON.stringify(input.productAttributes)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const userContent = context
    ? `Ürün bilgisi:\n${context}\n\nMüşteri sorusu: ${input.question}\n\nYukarıdaki bilgiye göre kısa, nazik cevabı yaz (sadece cevap metni):`
    : `Müşteri sorusu: ${input.question}\n\nGenel kısa ve nazik bir cevap yaz:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userContent}` }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 400,
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
        'Gemini günlük/dakikalık kota aşıldı. Birkaç dakika sonra tekrar deneyin veya .env dosyasına OPENAI_API_KEY ekleyerek OpenAI kullanın.'
      );
    }
    throw new Error(`Gemini API hatası ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return { answer: text, model: 'gemini-2.0-flash' };
}

/**
 * Müşteri sorusunu ürün bilgisine göre cevaplar.
 */
export async function answerCustomerQuestion(
  input: AnswerQuestionInput
): Promise<AnswerQuestionResult> {
  const question = input.question?.trim();
  if (!question) {
    throw new Error('Soru metni gerekli');
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (openaiKey) {
    return answerWithOpenAI(input, openaiKey);
  }
  if (geminiKey) {
    return answerWithGemini(input, geminiKey);
  }

  throw new Error(
    'AI soru-cevap için OPENAI_API_KEY veya GEMINI_API_KEY ortam değişkeni tanımlanmalı'
  );
}
