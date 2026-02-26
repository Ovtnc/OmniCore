'use client';

import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconClassName?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel = 'Hadi Başlayalım',
  onAction,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-muted/30 via-muted/20 to-transparent px-8 py-16',
        className
      )}
    >
      <div
        className={cn(
          'mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/20',
          iconClassName
        )}
      >
        <Icon className="h-10 w-10 text-primary" strokeWidth={1.25} />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        {description}
      </p>
      {onAction && actionLabel && (
        <Button
          className="mt-6 rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
