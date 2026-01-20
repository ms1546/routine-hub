// Storybook用のモック: next/navigation
// StorybookではNext.jsのルーターが動作しないため、モックに置き換える

import { useState, useCallback } from 'react';

export function useRouter() {
  const push = useCallback((url: string) => {
    console.log('[Storybook Mock] Router.push:', url);
  }, []);

  const replace = useCallback((url: string) => {
    console.log('[Storybook Mock] Router.replace:', url);
  }, []);

  const refresh = useCallback(() => {
    console.log('[Storybook Mock] Router.refresh');
  }, []);

  const back = useCallback(() => {
    console.log('[Storybook Mock] Router.back');
  }, []);

  const forward = useCallback(() => {
    console.log('[Storybook Mock] Router.forward');
  }, []);

  const prefetch = useCallback((url: string) => {
    console.log('[Storybook Mock] Router.prefetch:', url);
  }, []);

  return {
    push,
    replace,
    refresh,
    back,
    forward,
    prefetch
  };
}

export function useSearchParams() {
  const [params] = useState(() => new URLSearchParams());

  return params;
}

export function usePathname() {
  return '/storybook';
}

export function redirect(url: string) {
  console.log('[Storybook Mock] redirect:', url);
  // Storybookでは実際のリダイレクトは行わない
  // Next.jsのredirectは特殊なエラーをthrowするが、Storybookでは通常のエラーで十分
  throw new Error(`[Storybook Mock] redirect called with: ${url}. This is a mock and does not perform actual redirection.`);
}

export function notFound() {
  console.log('[Storybook Mock] notFound called');
  // Storybookでは実際の404は行わない
  throw new Error('[Storybook Mock] notFound called. This is a mock and does not perform actual 404 handling.');
}
