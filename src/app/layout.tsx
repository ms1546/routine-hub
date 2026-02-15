import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/shared/utils';
import './globals.css';
import { getMaintenanceState } from '@/infrastructure/system/maintenance';
import { MaintenanceScreen } from '@/shared/components/maintenance-screen';
import { SessionProvider } from '@/shared/components/session-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Routune Hub',
  description: 'Reuse, customize, and apply purposeful routines with AI-assisted guidance.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const maintenance = getMaintenanceState();
  return (
    <html lang="ja">
      <body className={cn('min-h-screen bg-background font-sans antialiased text-foreground', inter.className)}>
        <SessionProvider>
          {maintenance.enabled ? <MaintenanceScreen message={maintenance.message} /> : children}
        </SessionProvider>
      </body>
    </html>
  );
}
