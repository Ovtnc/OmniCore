'use client';

import { cn } from '@/lib/utils';
import { getBrandLabel, getBrandLogoPath } from '@/lib/brands';

type Props = {
  code: string;
  label?: string;
  className?: string;
  logoClassName?: string;
  hideLogo?: boolean;
  showLabel?: boolean;
};

export function BrandChip({
  code,
  label,
  className,
  logoClassName,
  hideLogo = false,
  showLabel = true,
}: Props) {
  const text = label ?? getBrandLabel(code);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {!hideLogo && (
        <img
          src={getBrandLogoPath(code)}
          alt=""
          className={cn('h-4 w-4 rounded-sm bg-white object-contain p-[1px]', logoClassName)}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {showLabel && <span>{text}</span>}
    </span>
  );
}
