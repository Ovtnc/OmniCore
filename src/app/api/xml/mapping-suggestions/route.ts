/**
 * AI ile XML etiketlerini Product alanlarına eşleştirme önerileri
 * POST body: { xmlTags: string[], sampleValues?: Record<string, string> }
 */
import { NextRequest, NextResponse } from 'next/server';
import { PRODUCT_MAIN_FIELDS, VARIANT_ATTRIBUTE_TYPES } from '@/lib/xml-mapping-config';

const OPENAI_SYSTEM = `Sen bir e-ticaret veri eşleştirme uzmanısın. XML'deki etiket adlarını (Türkçe/İngilizce/rastgele) aşağıdaki Product alanlarıyla eşleştiriyorsun.

Product ana alanları: ${PRODUCT_MAIN_FIELDS.map((f) => `${f.key} (${f.label}, tip: ${f.type})`).join(', ')}
Varyant alanları: ${VARIANT_ATTRIBUTE_TYPES.map((v) => `${v.key} (${v.label})`).join(', ')}

Kurallar:
- Her Product alanı için en uygun XML etiketini seç (yoksa null).
- confidence 0.0-1.0 arası (1.0 = kesin eşleşme).
- Sadece JSON döndür, başka metin yazma. Format:
{"suggestions":[{"productField":"name","xmlTag":"urun_adi","confidence":0.95}, ...], "variants":[{"productField":"color","xmlTag":"renk","confidence":0.9}, ...]}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const xmlTags = Array.isArray(body.xmlTags) ? body.xmlTags as string[] : [];
    const sampleValues = (typeof body.sampleValues === 'object' && body.sampleValues !== null)
      ? (body.sampleValues as Record<string, string>)
      : {};

    if (xmlTags.length === 0) {
      return NextResponse.json(
        { error: 'xmlTags dizisi gerekli' },
        { status: 400 }
      );
    }

    const apiKeyOpenAI = process.env.OPENAI_API_KEY;
    const apiKeyGemini = process.env.GEMINI_API_KEY;

    const tagsDesc = xmlTags.join(', ');
    const samplesDesc = Object.keys(sampleValues).length
      ? '\nÖrnek değerler: ' + JSON.stringify(sampleValues).slice(0, 1500)
      : '';
    const userContent = `XML etiketleri: ${tagsDesc}${samplesDesc}\n\nYukarıdaki etiketleri Product alanlarıyla eşleştir. JSON formatında suggestions ve variants döndür.`;

    let rawResponse: string;

    if (apiKeyOpenAI) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeyOpenAI}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: OPENAI_SYSTEM },
            { role: 'user', content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${err}`);
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; model?: string };
      rawResponse = data.choices?.[0]?.message?.content?.trim() ?? '';
    } else if (apiKeyGemini) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeyGemini}`;
      const geminiBody = JSON.stringify({
        contents: [{ parts: [{ text: `${OPENAI_SYSTEM}\n\n${userContent}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
      });
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: geminiBody,
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 4000));
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiBody,
        });
      }
      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429) {
          throw new Error(
            'Gemini kota aşıldı. Birkaç dakika sonra tekrar deneyin veya OPENAI_API_KEY ekleyin.'
          );
        }
        throw new Error(`Gemini API ${res.status}: ${err}`);
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    } else {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY veya GEMINI_API_KEY ortam değişkeni gerekli' },
        { status: 503 }
      );
    }

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse;
    const parsed = JSON.parse(jsonStr) as {
      suggestions?: Array<{ productField: string; xmlTag: string; confidence: number }>;
      variants?: Array<{ productField: string; xmlTag: string; confidence: number }>;
    };

    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const variants = Array.isArray(parsed.variants) ? parsed.variants : [];

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        productField: s.productField,
        xmlTag: s.xmlTag ?? '',
        confidence: typeof s.confidence === 'number' ? Math.min(1, Math.max(0, s.confidence)) : 0.5,
      })),
      variants: variants.map((v) => ({
        productField: v.productField,
        xmlTag: v.xmlTag ?? '',
        confidence: typeof v.confidence === 'number' ? Math.min(1, Math.max(0, v.confidence)) : 0.5,
      })),
      model: apiKeyOpenAI ? 'openai' : 'gemini',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('mapping-suggestions error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
