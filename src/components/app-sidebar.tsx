'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Store,
  Link2,
  Calculator,
  Wallet,
  Truck,
  Users,
  Wrench,
  FileCode2,
  Headphones,
  Bell,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  Star,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSession } from 'next-auth/react';

const SIDEBAR_WIDTH = 280;

function UserBlock() {
  const { data: session, status } = useSession();
  if (status !== 'authenticated' || !session?.user) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="truncate px-1 text-xs text-muted-foreground" title={session.user.email ?? ''}>
        {session.user.email}
      </p>
      {session.user.plan && (
        <p className="truncate px-1 text-xs font-medium text-primary">{session.user.plan}</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="h-4 w-4" />
        Çıkış yap
      </Button>
    </div>
  );
}

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
  { title: 'Ödemeler', href: '/payments', icon: Wallet },
  { title: 'Lojistik', href: '/logistics', icon: Truck },
  { title: 'B2B', href: '/b2b', icon: Users },
  { title: 'Raporlar', href: '/reports', icon: BarChart3 },
  { title: 'Bildirimler', href: '/notifications', icon: Bell },
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

type SearchItem = {
  title: string;
  href: string;
  section: string;
};

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openPanels, setOpenPanels] = React.useState<string[]>(['Kontrol Paneli']);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const searchItems = React.useMemo(() => {
    const byHref = new Map<string, SearchItem>();
    for (const item of navMain) {
      if ('items' in item) {
        for (const sub of item.items ?? []) {
          byHref.set(sub.href, {
            title: sub.title,
            href: sub.href,
            section: item.title,
          });
        }
      } else {
        byHref.set(item.href, {
          title: item.title,
          href: item.href,
          section: 'Menü',
        });
      }
    }
    for (const quick of navQuick) {
      if (!byHref.has(quick.href)) {
        byHref.set(quick.href, {
          title: quick.title,
          href: quick.href,
          section: 'Hızlı Erişim',
        });
      }
    }
    return Array.from(byHref.values());
  }, []);

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return searchItems;
    return searchItems.filter((item) => {
      const hay = `${item.title} ${item.section} ${item.href}`.toLocaleLowerCase('tr-TR');
      return hay.includes(q);
    });
  }, [query, searchItems]);

  const goTo = React.useCallback((href: string) => {
    setSearchOpen(false);
    setQuery('');
    router.push(href);
    onClose?.();
  }, [router, onClose]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const togglePanel = (title: string) => {
    setOpenPanels((prev) =>
      prev.includes(title) ? prev.filter((p) => p !== title) : [...prev, title]
    );
  };

  return (
    <aside
      className="flex h-full min-h-0 max-h-screen flex-col overflow-hidden border-r bg-card lg:h-screen"
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
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Global aramayı aç"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0" />
            Arama
          </span>
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono sm:inline-block">
            CTRL + K
          </kbd>
        </button>
      </div>

      {/* Ana menü */}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
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

      {/* Kullanıcı + Çıkış */}
      <div className="border-t p-3 space-y-2">
        <UserBlock />
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <span className="text-xs text-muted-foreground">v1.0.0</span>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base">Global Arama</DialogTitle>
            <DialogDescription>Sayfa adı veya yol yazarak hızlıca geçiş yapın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredItems.length > 0) {
                  e.preventDefault();
                  goTo(filteredItems[0].href);
                }
              }}
              placeholder="Örn: sipariş, rapor, /products"
            />
            <div className="max-h-80 overflow-y-auto rounded-md border">
              {filteredItems.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Sonuç bulunamadı.</p>
              ) : (
                <ul className="divide-y">
                  {filteredItems.map((item) => (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => goTo(item.href)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
                      >
                        <span className="text-sm">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.href}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;
