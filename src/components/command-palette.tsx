'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  Star,
} from 'lucide-react';

const commands: { title: string; href: string; icon: typeof LayoutDashboard; keywords?: string[] }[] = [
  { title: 'Genel Bakış', href: '/', icon: LayoutDashboard, keywords: ['dashboard', 'ana'] },
  { title: 'Mağazalar', href: '/stores', icon: Store, keywords: ['mağaza', 'store'] },
  { title: 'Ürünler / Katalog', href: '/products', icon: Package, keywords: ['ürün', 'katalog', 'product'] },
  { title: 'Siparişler', href: '/orders', icon: ShoppingCart, keywords: ['sipariş', 'order'] },
  { title: 'Pazaryeri', href: '/marketplace', icon: Link2, keywords: ['pazaryeri', 'trendyol', 'hepsiburada'] },
  { title: 'Muhasebe', href: '/accounting', icon: Calculator, keywords: ['muhasebe', 'fatura'] },
  { title: 'Ödemeler', href: '/payments', icon: Wallet, keywords: ['ödeme', 'payment'] },
  { title: 'Lojistik', href: '/logistics', icon: Truck, keywords: ['kargo', 'lojistik'] },
  { title: 'B2B', href: '/b2b', icon: Users, keywords: ['b2b'] },
  { title: 'Raporlar', href: '/reports', icon: BarChart3, keywords: ['rapor', 'report'] },
  { title: 'Bildirimler', href: '/notifications', icon: Bell, keywords: ['bildirim'] },
  { title: 'Araçlar', href: '/tools', icon: Wrench, keywords: ['araç', 'xml', 'iş'] },
  { title: 'XML Sihirbazı', href: '/xml-wizard', icon: FileCode2, keywords: ['xml', 'import'] },
  { title: 'Destek', href: '/support', icon: Headphones, keywords: ['destek', 'support'] },
  { title: 'Ayarlar', href: '/settings', icon: Settings, keywords: ['ayar', 'settings'] },
  { title: 'Hızlı Erişim', href: '/', icon: Star, keywords: ['genel'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const run = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Sayfa veya komut ara… (⌘K)" className="rounded-xl" />
      <CommandList>
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
        <CommandGroup heading="Sayfalar">
          {commands.map((c) => (
            <CommandItem
              key={c.href + c.title}
              value={`${c.title} ${c.keywords?.join(' ') ?? ''}`}
              onSelect={() => run(c.href)}
              className="rounded-xl aria-selected:bg-primary/10 aria-selected:text-primary"
            >
              <c.icon className="mr-3 h-4 w-4 shrink-0 opacity-70" strokeWidth={1.5} />
              {c.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
