'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppSidebar } from '@/components/app-sidebar';

const SidebarContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
} | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function MobileSidebarTrigger() {
  const { setOpen } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={() => setOpen(true)}
      aria-label="Menüyü aç"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

export function MobileSidebar() {
  const { open, setOpen } = useSidebar();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[280px] p-0" showClose={false}>
        <AppSidebar onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
