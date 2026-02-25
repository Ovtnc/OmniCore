'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'>
>(({ ...props }, ref) => (
  <nav ref={ref} aria-label="Breadcrumb" {...props} />
));
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<'ol'>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground',
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('inline-flex items-center gap-1.5', className)} {...props} />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & { isActive?: boolean }
>(({ className, isActive, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      'transition-colors hover:text-foreground',
      isActive ? 'font-medium text-foreground' : ''
    )}
    {...props}
  />
));
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbSeparator = ({ className, ...props }: React.ComponentProps<'li'>) => (
  <li className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)} {...props}>
    <ChevronRight className="text-muted-foreground" />
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator };
