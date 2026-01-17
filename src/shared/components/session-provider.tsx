'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { DisplayNameChecker } from './display-name-checker';

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
      <DisplayNameChecker />
    </NextAuthSessionProvider>
  );
}
