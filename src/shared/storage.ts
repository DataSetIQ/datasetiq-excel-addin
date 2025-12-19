// Type declaration for Office.js global
declare const OfficeRuntime: any;

const STORAGE_KEY = 'DATASETIQ_API_KEY';

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
