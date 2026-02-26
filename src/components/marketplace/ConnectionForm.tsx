'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPlatformFields } from '@/services/marketplaces/platform-fields';
import { BrandChip } from '@/components/ui/brand-chip';

export interface ConnectionFormValues {
  platform: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  extraConfig: Record<string, string>;
}

const PLATFORM_OPTIONS = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'N11', label: 'N11' },
  { value: 'SHOPIFY', label: 'Shopify' },
  { value: 'CICEKSEPETI', label: 'Çiçeksepeti' },
  { value: 'PAZARAMA', label: 'Pazarama' },
  { value: 'IDEFIX', label: 'İdefix' },
  { value: 'GOTURC', label: 'GoTurc' },
  { value: 'PTTAVM', label: 'PTT Avm' },
  { value: 'MODANISA', label: 'ModaNisa' },
  { value: 'ALLESGO', label: 'Allesgo' },
  { value: 'CIMRI', label: 'Cimri' },
  { value: 'AKAKCE', label: 'Akakçe' },
  { value: 'GOOGLE_MERCHANT', label: 'Google Merchant' },
  { value: 'META_CATALOG', label: 'Meta Katalog' },
  { value: 'GITTIGIDIYOR', label: 'GittiGidiyor' },
  { value: 'OTHER', label: 'Diğer' },
] as const;

type Props = {
  value: ConnectionFormValues;
  onChange: (v: ConnectionFormValues) => void;
  disabled?: boolean;
};

export function ConnectionForm({ value, onChange, disabled }: Props) {
  const fields = useMemo(() => getPlatformFields(value.platform), [value.platform]);
  const hasCredentialFields = fields.some((f) => f.storeAs === 'apiKey' || f.storeAs === 'apiSecret');
  const hasSellerIdField = fields.some((f) => f.storeAs === 'sellerId');

  const update = (patch: Partial<ConnectionFormValues>) => {
    onChange({ ...value, ...patch });
  };

  const setExtra = (name: string, val: string) => {
    update({ extraConfig: { ...value.extraConfig, [name]: val } });
  };

  const getFieldValue = (fieldName: string, storeAs?: string) => {
    if (storeAs === 'apiKey') return value.apiKey;
    if (storeAs === 'apiSecret') return value.apiSecret;
    if (storeAs === 'sellerId') return value.sellerId;
    return value.extraConfig[fieldName] ?? '';
  };

  const setFieldValue = (fieldName: string, storeAs: string | undefined, val: string) => {
    if (storeAs === 'apiKey') update({ apiKey: val });
    else if (storeAs === 'apiSecret') update({ apiSecret: val });
    else if (storeAs === 'sellerId') update({ sellerId: val });
    else setExtra(fieldName, val);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="platform">Pazaryeri</Label>
        <Select
          value={value.platform || undefined}
          onValueChange={(v) => update({ platform: v, extraConfig: {} })}
          disabled={disabled}
        >
          <SelectTrigger id="platform">
            <SelectValue placeholder="Seçin" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                <BrandChip code={p.value} label={p.label} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.platform && fields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && ' *'}
              </Label>
              {field.type === 'select' ? (
                <Select
                  value={getFieldValue(field.name, field.storeAs)}
                  onValueChange={(v) => setFieldValue(field.name, field.storeAs, v)}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={getFieldValue(field.name, field.storeAs)}
                  onChange={(e) => setFieldValue(field.name, field.storeAs, e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {value.platform && !hasCredentialFields && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              autoComplete="off"
              placeholder="••••••••"
              value={value.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              autoComplete="off"
              placeholder="••••••••"
              value={value.apiSecret}
              onChange={(e) => update({ apiSecret: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {value.platform && !hasSellerIdField && fields.length === 0 && (
        <div className="space-y-2">
          <Label htmlFor="sellerId">Satıcı ID / Supplier ID</Label>
          <Input
            id="sellerId"
            placeholder="Opsiyonel"
            value={value.sellerId}
            onChange={(e) => update({ sellerId: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
