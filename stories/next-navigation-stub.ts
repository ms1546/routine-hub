/**
 * Storybook用のモック: next/navigation
 * StorybookではNext.jsのルーターが動作しないため、モックに置き換える
 */

import { useState, useCallback, useEffect } from 'react';

// Storybook内でクエリパラメータを管理するためのグローバル状態
let globalSearchParams = new URLSearchParams();

export function useRouter() {
  const push = useCallback((url: string) => {
    console.log('[Storybook Mock] Router.push:', url);
    // URLからクエリパラメータを抽出して更新
    try {
      const urlObj = new URL(url, 'http://localhost');
      globalSearchParams = new URLSearchParams(urlObj.search);
      // コンポーネントの再レンダリングをトリガーするために、イベントを発火
      window.dispatchEvent(new CustomEvent('storybook:search-params-changed'));
    } catch (e) {
      // URLが相対パスの場合
      const match = url.match(/\?(.+)$/);
      if (match) {
        globalSearchParams = new URLSearchParams(match[1]);
        window.dispatchEvent(new CustomEvent('storybook:search-params-changed'));
      }
    }
  }, []);

  const replace = useCallback((url: string) => {
    console.log('[Storybook Mock] Router.replace:', url);
    try {
      const urlObj = new URL(url, 'http://localhost');
      globalSearchParams = new URLSearchParams(urlObj.search);
      window.dispatchEvent(new CustomEvent('storybook:search-params-changed'));
    } catch (e) {
      const match = url.match(/\?(.+)$/);
      if (match) {
        globalSearchParams = new URLSearchParams(match[1]);
        window.dispatchEvent(new CustomEvent('storybook:search-params-changed'));
      }
    }
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
  const [params, setParams] = useState(() => new URLSearchParams(globalSearchParams));

  useEffect(() => {
    const handleChange = () => {
      setParams(new URLSearchParams(globalSearchParams));
    };
    window.addEventListener('storybook:search-params-changed', handleChange);
    return () => {
      window.removeEventListener('storybook:search-params-changed', handleChange);
    };
  }, []);

  return params;
}

export function usePathname() {
  return '/storybook';
}

export function redirect(url: string) {
  console.log('[Storybook Mock] redirect:', url);
  // Storybookでは実際のリダイレクトは行わない
  throw new Error(`[Storybook Mock] redirect called with: ${url}. This is a mock and does not perform actual redirection.`);
}

export function notFound() {
  console.log('[Storybook Mock] notFound called');
  // Storybookでは実際の404は行わない
  throw new Error('[Storybook Mock] notFound called. This is a mock and does not perform actual 404 handling.');
}
