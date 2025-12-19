// Type declaration for Office.js global
declare const OfficeRuntime: any;

const STORAGE_KEY = 'DATASETIQ_API_KEY';
const FAVORITES_KEY = 'DATASETIQ_FAVORITES';
const RECENT_KEY = 'DATASETIQ_RECENT';

export interface StoredKey {
  key: string | null;
  supported: boolean;
}

export async function getStoredApiKey(): Promise<StoredKey> {
  if (typeof OfficeRuntime === 'undefined' || !OfficeRuntime.storage) {
    return { key: null, supported: false };
  }
  try {
    const key = await OfficeRuntime.storage.getItem(STORAGE_KEY);
    return { key: key ?? null, supported: true };
  } catch (_err) {
    return { key: null, supported: false };
  }
}

export async function setStoredApiKey(key: string): Promise<void> {
  if (typeof OfficeRuntime === 'undefined' || !OfficeRuntime.storage) {
    throw new Error('Storage not available');
  }
  await OfficeRuntime.storage.setItem(STORAGE_KEY, key);
}

export async function clearStoredApiKey(): Promise<void> {
  if (typeof OfficeRuntime === 'undefined' || !OfficeRuntime.storage) {
    return;
  }
  try {
    await OfficeRuntime.storage.removeItem(STORAGE_KEY);
  } catch (_err) {
    // ignore
  }
}

// Favorites management
export async function getFavorites(): Promise<string[]> {
  if (typeof OfficeRuntime === 'undefined' || !OfficeRuntime.storage) {
    return [];
  }
  try {
    const data = await OfficeRuntime.storage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (_err) {
    return [];
  }
}

export async function addFavorite(seriesId: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(seriesId)) {
    favorites.unshift(seriesId);
    await OfficeRuntime.storage.setItem(FAVORITES_KEY, JSON.stringify(favorites.slice(0, 50)));
  }
}

export async function removeFavorite(seriesId: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter(id => id !== seriesId);
  await OfficeRuntime.storage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

// Recent series management
export async function getRecent(): Promise<string[]> {
  if (typeof OfficeRuntime === 'undefined' || !OfficeRuntime.storage) {
    return [];
  }
  try {
    const data = await OfficeRuntime.storage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch (_err) {
    return [];
  }
}

export async function addRecent(seriesId: string): Promise<void> {
  const recent = await getRecent();
  const filtered = recent.filter(id => id !== seriesId);
  filtered.unshift(seriesId);
  await OfficeRuntime.storage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 20)));
}
