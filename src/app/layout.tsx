import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { TopRouteLoader } from '@/components/navigation/TopRouteLoader';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'OmniCore | E-Ticaret Yönetim Merkezi',
  description: 'B2C, B2B, Pazaryeri, E-Fatura ve Muhasebe tek çatıda.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="omnicore-theme">
          <AuthSessionProvider>
            <Suspense fallback={null}>
              <TopRouteLoader />
            </Suspense>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
