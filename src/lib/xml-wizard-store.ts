import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FieldMapping = Record<string, string>; // productField -> xmlTag
export type VariantMapping = Array<{ attributeKey: string; xmlTag: string }>;

export interface XmlWizardState {
  step: number;
  // Step 1
  xmlUrl: string;
  xmlTestOk: boolean;
  xmlTags: string[];
  sampleValues: Record<string, string>;
  itemCount: number;
  // Step 2
  selectedPlatforms: string[];
  // Step 3
  fieldMapping: FieldMapping;
  variantMapping: VariantMapping;
  hasVariants: boolean;
  aiMappedFields: string[]; // "name" | "color" etc - Yapay Zeka tarafından eşleştirildi
  // Step 4
  confirmed: boolean;
}

type XmlWizardActions = {
  setStep: (step: number) => void;
  setXmlUrl: (url: string) => void;
  setXmlTestOk: (ok: boolean) => void;
  setXmlTags: (tags: string[], sampleValues: Record<string, string>, itemCount: number) => void;
  setSelectedPlatforms: (platforms: string[]) => void;
  setFieldMapping: (field: string, xmlTag: string) => void;
  setVariantMapping: (attributeKey: string, xmlTag: string) => void;
  setHasVariants: (v: boolean) => void;
  applyAiSuggestions: (suggestions: Array<{ productField: string; xmlTag: string; confidence: number }>, variants: Array<{ productField: string; xmlTag: string; confidence: number }>, threshold?: number) => void;
  setAiMappedField: (field: string, isAi: boolean) => void;
  setConfirmed: (v: boolean) => void;
  reset: () => void;
};

const initialState: XmlWizardState = {
  step: 1,
  xmlUrl: '',
  xmlTestOk: false,
  xmlTags: [],
  sampleValues: {},
  itemCount: 0,
  selectedPlatforms: [],
  fieldMapping: {},
  variantMapping: [],
  hasVariants: false,
  aiMappedFields: [],
  confirmed: false,
};

export const useXmlWizardStore = create<XmlWizardState & XmlWizardActions>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setXmlUrl: (xmlUrl) => set({ xmlUrl, xmlTestOk: false }),
      setXmlTestOk: (xmlTestOk) => set({ xmlTestOk }),
      setXmlTags: (xmlTags, sampleValues, itemCount) =>
        set({ xmlTags, sampleValues, itemCount }),
      setSelectedPlatforms: (selectedPlatforms) => set({ selectedPlatforms }),
      setFieldMapping: (field, xmlTag) =>
        set((s) => ({
          fieldMapping: { ...s.fieldMapping, [field]: xmlTag },
        })),
      setVariantMapping: (attributeKey, xmlTag) =>
        set((s) => {
          const next = s.variantMapping.filter((m) => m.attributeKey !== attributeKey);
          if (xmlTag) next.push({ attributeKey, xmlTag });
          return { variantMapping: next };
        }),
      setHasVariants: (hasVariants) => set({ hasVariants }),
      applyAiSuggestions: (suggestions, variants, threshold = 0.8) =>
        set((s) => {
          const newMapping = { ...s.fieldMapping };
          const newVariant: VariantMapping = [...s.variantMapping];
          const newAi = [...s.aiMappedFields];
          suggestions.forEach(({ productField, xmlTag, confidence }) => {
            if (xmlTag && confidence >= threshold) {
              newMapping[productField] = xmlTag;
              if (!newAi.includes(productField)) newAi.push(productField);
            }
          });
          variants.forEach(({ productField, xmlTag, confidence }) => {
            if (xmlTag && confidence >= threshold) {
              const idx = newVariant.findIndex((m) => m.attributeKey === productField);
              if (idx >= 0) newVariant[idx] = { attributeKey: productField, xmlTag };
              else newVariant.push({ attributeKey: productField, xmlTag });
              if (!newAi.includes(productField)) newAi.push(productField);
            }
          });
          return {
            fieldMapping: newMapping,
            variantMapping: newVariant,
            aiMappedFields: newAi,
          };
        }),
      setAiMappedField: (field, isAi) =>
        set((s) => {
          const next = s.aiMappedFields.filter((f) => f !== field);
          if (isAi) next.push(field);
          return { aiMappedFields: next };
        }),
      setConfirmed: (confirmed) => set({ confirmed }),
      reset: () => set(initialState),
    }),
    {
      name: 'omnicore-xml-wizard',
      version: 2,
      migrate: (persistedState) => {
        const raw = (persistedState ?? {}) as Partial<XmlWizardState>;
        const selectedPlatforms = Array.isArray(raw.selectedPlatforms)
          ? raw.selectedPlatforms.filter((p): p is string => typeof p === 'string')
          : [];
        return {
          ...initialState,
          ...raw,
          selectedPlatforms,
        };
      },
    }
  )
);
