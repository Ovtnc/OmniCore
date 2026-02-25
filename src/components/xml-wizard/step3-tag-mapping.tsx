'use client';

import { useState, useMemo } from 'react';
import { Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useXmlWizardStore } from '@/lib/xml-wizard-store';
import {
  PRODUCT_MAIN_FIELDS,
  VARIANT_ATTRIBUTE_TYPES,
  getMappingValidationErrors,
  NUMERIC_FIELD_KEYS,
} from '@/lib/xml-mapping-config';

const EMPTY_VALUE = '__none__';

export function Step3TagMapping() {
  const {
    xmlTags,
    sampleValues,
    fieldMapping,
    variantMapping,
    hasVariants,
    aiMappedFields,
    setFieldMapping,
    setVariantMapping,
    setHasVariants,
    applyAiSuggestions,
  } = useXmlWizardStore();

  const [autoMappingLoading, setAutoMappingLoading] = useState(false);
  const [autoMappingError, setAutoMappingError] = useState('');
  const [validationWarnings, setValidationWarnings] = useState<Record<string, string>>({});

  const tagOptions = useMemo(() => [EMPTY_VALUE, ...xmlTags], [xmlTags]);

  const handleAutoMap = async () => {
    if (xmlTags.length === 0) return;
    setAutoMappingError('');
    setAutoMappingLoading(true);
    try {
      const res = await fetch('/api/xml/mapping-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlTags, sampleValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Öneri alınamadı');
      applyAiSuggestions(data.suggestions || [], data.variants || [], 0.8);
    } catch (e) {
      setAutoMappingError(e instanceof Error ? e.message : 'Otomatik eşleştirme yapılamadı');
    } finally {
      setAutoMappingLoading(false);
    }
  };

  const handleFieldChange = (productField: string, xmlTag: string) => {
    const value = xmlTag === EMPTY_VALUE ? '' : xmlTag;
    setFieldMapping(productField, value);
    if (NUMERIC_FIELD_KEYS.includes(productField) && value) {
      const errors = getMappingValidationErrors(
        productField,
        value,
        sampleValues[value]
      );
      setValidationWarnings((prev) => ({
        ...prev,
        [productField]: errors[0] || '',
      }));
    } else {
      setValidationWarnings((prev) => {
        const next = { ...prev };
        delete next[productField];
        return next;
      });
    }
  };

  const getVariantMapping = (attributeKey: string) =>
    variantMapping.find((m) => m.attributeKey === attributeKey)?.xmlTag ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etiket Eşleştirme</CardTitle>
        <CardDescription>
          XML etiketlerini Product alanlarına eşleyin. &quot;Otomatik Eşleştir&quot; ile tüm etiketler algoritma ile eşleştirilir (%80+ güven).
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoMap}
            disabled={autoMappingLoading || xmlTags.length === 0}
          >
            {autoMappingLoading ? (
              <span className="animate-pulse">Yükleniyor...</span>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Otomatik Eşleştir
              </>
            )}
          </Button>
          {autoMappingError && (
            <span className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {autoMappingError}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="main">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="main">Ana alanlar</TabsTrigger>
            <TabsTrigger value="variants">
              Varyantlar
              {hasVariants && (
                <span className="ml-1 text-xs bg-primary/20 px-1 rounded">Açık</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4 pt-4">
            <div className="space-y-4">
              {PRODUCT_MAIN_FIELDS.map((field) => (
                <div key={field.key} className="grid gap-2 sm:grid-cols-[180px_1fr_auto] items-start">
                  <Label className="text-sm font-medium pt-2">{field.label}</Label>
                  <div className="space-y-1">
                    <Select
                      value={fieldMapping[field.key] || EMPTY_VALUE}
                      onValueChange={(v) => handleFieldChange(field.key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Etiket seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {tagOptions.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag === EMPTY_VALUE ? '— Eşleşme yok —' : tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationWarnings[field.key] && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {validationWarnings[field.key]}
                      </p>
                    )}
                    {'hint' in field && field.hint && (
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    )}
                  </div>
                  {aiMappedFields.includes(field.key) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      Otomatik eşleştirildi
                    </span>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasVariants"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="hasVariants">XML varyantlı (renk, beden vb. alt etiketler var)</Label>
            </div>
            {hasVariants && (
              <div className="space-y-4">
                {VARIANT_ATTRIBUTE_TYPES.map((v) => (
                  <div key={v.key} className="grid gap-2 sm:grid-cols-[120px_1fr_auto] items-center">
                    <Label className="text-sm font-medium">{v.label}</Label>
                    <Select
                      value={getVariantMapping(v.key) || EMPTY_VALUE}
                      onValueChange={(val) =>
                        setVariantMapping(v.key, val === EMPTY_VALUE ? '' : val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Etiket seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {tagOptions.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag === EMPTY_VALUE ? '— Yok —' : tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {aiMappedFields.includes(v.key) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        Otomatik
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
