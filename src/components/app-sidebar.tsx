'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Store,
  Link2,
  Calculator,
  Truck,
  Wrench,
  FileCode2,
  Headphones,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  Star,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ThemeToggle } from '@/components/theme-toggle';

const SIDEBAR_WIDTH = 280;

const navMain = [
  {
    title: 'Kontrol Paneli',
    icon: LayoutDashboard,
    items: [
      { title: 'Genel Bakış', href: '/' },
      { title: 'Mağazalar', href: '/stores' },
      { title: 'Ürünler / Katalog', href: '/products' },
    ],
  },
  { title: 'Siparişler', href: '/orders', icon: ShoppingCart },
  { title: 'Pazaryeri', href: '/marketplace', icon: Link2 },
  { title: 'Muhasebe', href: '/accounting', icon: Calculator },
  { title: 'Lojistik', href: '/logistics', icon: Truck },
  { title: 'Raporlar', href: '/reports', icon: BarChart3 },
  { title: 'Araçlar', href: '/tools', icon: Wrench },
  { title: 'XML Kurulum Sihirbazı', href: '/xml-wizard', icon: FileCode2 },
  { title: 'Destek', href: '/support', icon: Headphones },
  { title: 'Ayarlar', href: '/settings', icon: Settings },
];

const navQuick = [
  { title: 'Genel Bakış', href: '/', icon: Star },
  { title: 'İşler & XML Import', href: '/tools', icon: Wrench },
  { title: 'Pazaryeri Bağlantıları', href: '/marketplace', icon: Link2 },
  { title: 'Raporlar', href: '/reports', icon: BarChart3 },
];

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [openPanels, setOpenPanels] = React.useState<string[]>(['Kontrol Paneli']);

  const togglePanel = (title: string) => {
    setOpenPanels((prev) =>
      prev.includes(title) ? prev.filter((p) => p !== title) : [...prev, title]
    );
  };

  return (
    <aside
      className="flex h-full flex-col border-r bg-card"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Logo + close (mobile) */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">OmniCore</span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Menüyü kapat">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Arama */}
      <div className="border-b p-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          onClick={() => {}}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Arama</span>
          <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-xs font-mono sm:inline-block">
            CTRL + K
          </kbd>
        </button>
      </div>

      {/* Ana menü */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navMain.map((item) => {
          if ('items' in item) {
            const isOpen = openPanels.includes(item.title);
            return (
              <Collapsible
                key={item.title}
                open={isOpen}
                onOpenChange={() => togglePanel(item.title)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {item.title}
                    </span>
                    <span className="flex items-center gap-1">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-muted pl-3">
                    {(item.items ?? []).map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                          pathname === sub.href
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                        {sub.title}
                      </Link>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {item.title}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </nav>

      {/* Hızlı erişim */}
      <div className="border-t p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hızlı Erişim
        </p>
        <div className="space-y-0.5">
          {navQuick.map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground',
                pathname === item.href && 'bg-accent text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.title}
              <ChevronRight className="ml-auto h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>

      {/* Alt: tema + versiyon */}
      <div className="flex items-center justify-between border-t p-3">
        <ThemeToggle />
        <span className="text-xs text-muted-foreground">v1.0.0 · 2025 OmniCore</span>
      </div>
    </aside>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;
