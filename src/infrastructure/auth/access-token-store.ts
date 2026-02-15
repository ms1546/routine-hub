type AccessTokenEntry = {
  token: string;
  expiresAt?: string;
};

const globalStoreKey = '__routuneHubAccessTokenStore__';
const globalStore = globalThis as typeof globalThis & {
  [key: string]: Map<string, AccessTokenEntry> | undefined;
};

const store = globalStore[globalStoreKey] ?? new Map<string, AccessTokenEntry>();
globalStore[globalStoreKey] = store;

const isExpired = (entry: AccessTokenEntry): boolean => {
  if (!entry.expiresAt) return false;
  const expiryMs = Date.parse(entry.expiresAt);
  if (Number.isNaN(expiryMs)) return false;
  const bufferMs = 60 * 1000; // 1 minute buffer
  return Date.now() >= expiryMs - bufferMs;
};

export function storeAccessToken(userId: string, token: string, expiresAt?: string) {
  store.set(userId, { token, expiresAt });
}

export function getStoredAccessToken(userId: string): string | null {
  const entry = store.get(userId);
  if (!entry) return null;
  if (isExpired(entry)) {
    store.delete(userId);
    return null;
  }
  return entry.token;
}

export function hasStoredAccessToken(userId: string): boolean {
  return getStoredAccessToken(userId) !== null;
}

export function clearStoredAccessToken(userId: string) {
  store.delete(userId);
}
