import { SidebarProvider, MobileSidebar, MobileSidebarTrigger } from '@/components/sidebar-provider';
import { AppSidebar } from '@/components/app-sidebar';
import { SIDEBAR_WIDTH_PX } from '@/components/app-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop: sabit sidebar */}
        <div
          className="hidden shrink-0 flex-col border-r bg-card lg:flex"
          style={{ width: SIDEBAR_WIDTH_PX }}
        >
          <AppSidebar />
        </div>

        {/* Mobile: drawer */}
        <MobileSidebar />

        {/* Ana içerik */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Üst bar: sadece mobilde menü butonu */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <MobileSidebarTrigger />
            <div className="flex-1" />
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
