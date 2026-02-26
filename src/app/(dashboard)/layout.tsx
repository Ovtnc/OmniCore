import { SidebarProvider, MobileSidebar, MobileSidebarTrigger } from '@/components/sidebar-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { SIDEBAR_WIDTH_PX } from '@/components/app-sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { QuickSyncPopover } from '@/components/sync/QuickSyncPopover';
import { CommandPalette } from '@/components/command-palette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Desktop: sabit sidebar */}
        <div
          className="hidden shrink-0 border-r bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex"
          style={{ width: SIDEBAR_WIDTH_PX }}
        >
          <AppSidebar />
        </div>

        {/* Mobile: drawer */}
        <MobileSidebar />

        {/* Ana içerik */}
        <div className="flex min-w-0 flex-1 flex-col lg:ml-[280px]">
          {/* Üst bar: sadece mobilde menü butonu */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <MobileSidebarTrigger />
            <div className="flex-1" />
            <QuickSyncPopover />
            <NotificationBell />
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
          <CommandPalette />
        </div>
      </div>
    </SidebarProvider>
  );
}
