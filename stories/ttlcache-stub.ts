// Storybook用モック: @isaacs/ttlcache
// browser-safe stub

export class TTLCache<K, V> {
    private cache = new Map<K, V>();

    constructor(_options?: { ttl?: number; max?: number }) {
      // noop
    }

    get(key: K): V | undefined {
      return this.cache.get(key);
    }

    set(key: K, value: V): this {
      this.cache.set(key, value);
      return this;
    }

    delete(key: K): boolean {
      return this.cache.delete(key);
    }

    clear(): void {
      this.cache.clear();
    }

    has(key: K): boolean {
      return this.cache.has(key);
    }

    get size(): number {
      return this.cache.size;
    }
  }

  // default export も提供（依存が default import しても落ちない）
  export default TTLCache;
