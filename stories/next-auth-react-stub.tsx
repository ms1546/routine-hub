import React from 'react';

export type Session = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
} | null;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useSession() {
  return {
    data: {
      user: {
        id: 'storybook-user',
        name: 'Storybook User',
        email: 'routunehub.dev@gmail.com'
      }
    } as Session,
    status: 'authenticated' as const,
    update: async () => {}
  };
}

export async function signIn() {
  return { ok: true };
}

export async function signOut() {
  return { ok: true };
}
