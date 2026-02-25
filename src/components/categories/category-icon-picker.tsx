'use client';

import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

export const CATEGORY_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: 'Folder', label: 'Klasör' },
  { value: 'FolderOpen', label: 'Açık klasör' },
  { value: 'Tag', label: 'Etiket' },
  { value: 'Box', label: 'Kutu' },
  { value: 'Package', label: 'Paket' },
  { value: 'ShoppingBag', label: 'Çanta' },
  { value: 'Shirt', label: 'Giyim' },
  { value: 'Home', label: 'Ev' },
  { value: 'Utensils', label: 'Yemek' },
  { value: 'Book', label: 'Kitap' },
  { value: 'Music', label: 'Müzik' },
  { value: 'Camera', label: 'Kamera' },
  { value: 'Smartphone', label: 'Telefon' },
  { value: 'Laptop', label: 'Bilgisayar' },
  { value: 'Sofa', label: 'Mobilya' },
  { value: 'Car', label: 'Araç' },
  { value: 'TreePine', label: 'Doğa' },
  { value: 'Flower2', label: 'Çiçek' },
  { value: 'Gamepad2', label: 'Oyun' },
  { value: 'Baby', label: 'Bebek' },
  { value: 'Briefcase', label: 'İş' },
  { value: 'Dumbbell', label: 'Spor' },
  { value: 'Heart', label: 'Sağlık' },
  { value: 'Sparkles', label: 'Kozmetik' },
];

const iconMap = CATEGORY_ICON_OPTIONS.reduce<
  Record<string, React.ComponentType<{ className?: string }>>
>(
  (acc, { value }) => {
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[value];
    if (Icon) acc[value] = Icon;
    return acc;
  },
  {}
);

type Props = {
  value: string | null;
  onChange: (icon: string | null) => void;
  className?: string;
};

export function CategoryIconPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn('grid grid-cols-5 sm:grid-cols-6 gap-2', className)}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          !value && 'border-primary bg-primary/10 text-primary'
        )}
        title="İkon yok"
      >
        —
      </button>
      {CATEGORY_ICON_OPTIONS.map(({ value: v }) => {
        const Icon = iconMap[v];
        if (!Icon) return null;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-muted',
              value === v ? 'border-primary bg-primary/10 text-primary' : 'border-input'
            )}
            title={v}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

export function CategoryIcon({ iconName }: { iconName: string | null }) {
  if (!iconName) return null;
  const Icon = iconMap[iconName];
  if (!Icon) return null;
  return <Icon className="h-4 w-4" />;
}
