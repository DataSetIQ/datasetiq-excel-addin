export const BASE_URL = 'https://datasetiq.com';
export const CONNECT_MESSAGE = 'Please open DataSetIQ sidebar to connect.';
const SERIES_PATH = '/api/public/sheets/series/';
const ME_PATH = '/api/public/sheets/me';
const SEARCH_PATH = '/api/public/search';
export const HEADER_ROW = ['Date', 'Value'];

export type ErrorCode =
  | 'NO_KEY'
  | 'INVALID_KEY'
  | 'REVOKED_KEY'
  | 'FREE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'PLAN_REQUIRED'
  | 'UNKNOWN';

export interface SeriesResponse {
  meta?: { id: string; etag: string; [key: string]: any };
  data?: Array<[string, number]>;
  scalar?: number;
  error?: { code: string; message: string };
}

export interface MeResponse {
  email: string;
  plan: string;
  quota: { used: number; limit: number; reset: string };
  status: string;
}

export interface SearchResult {
  id: string;
  title: string;
  frequency?: string;
  units?: string;
  source?: string;
}

export const SOURCES = [
  { id: 'FRED', name: 'FRED (Federal Reserve)' },
  { id: 'BLS', name: 'BLS (Bureau of Labor Statistics)' },
  { id: 'OECD', name: 'OECD' },
  { id: 'EUROSTAT', name: 'Eurostat' },
  { id: 'IMF', name: 'IMF' },
  { id: 'WORLDBANK', name: 'World Bank' },
  { id: 'ECB', name: 'ECB (European Central Bank)' },
  { id: 'BOE', name: 'Bank of England' },
  { id: 'CENSUS', name: 'US Census Bureau' },
  { id: 'EIA', name: 'EIA (Energy Information)' },
];

export interface FetchOptions {
  seriesId: string;
  mode: 'table' | 'latest' | 'value' | 'yoy' | 'meta';
  apiKey?: string | null;
  freq?: string;
  start?: string;
  date?: string;
}

export interface FetchResult {
  response?: SeriesResponse;
  error?: string;
  status?: number;
  headers?: Headers | Record<string, string>;
}

export function normalizeOptionalString(value: any): string | undefined {
  if (value === null || typeof value === 'undefined') return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return String(value);
}

export function normalizeDateInput(value: any): string | undefined {
  if (value === null || typeof value === 'undefined' || value === '') {
    return undefined;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const date = value as Date;
    if (isNaN(date.getTime())) throw new Error('Invalid date.');
    return date.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    // Excel serial date to ISO (days since 1899-12-31).
    // Note: Excel treats 1900 as a leap year (bug), affecting dates before 1900-03-01.
    if (value < 0) throw new Error('Invalid date serial number.');
    const epoch = Date.UTC(1899, 11, 30);
    const ms = epoch + value * 24 * 60 * 60 * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('Invalid date input.');
}

export function buildArrayResult(data: Array<[string, number]>): any[][] {
  if (!Array.isArray(data)) {
    return [HEADER_ROW];
  }
  const sorted = [...data].sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  return [HEADER_ROW, ...sorted];
}

export async function fetchSeries(options: FetchOptions): Promise<FetchResult> {
  const { seriesId, mode, apiKey, freq, start, date } = options;
  const url = new URL(`${BASE_URL}${SERIES_PATH}${encodeURIComponent(seriesId)}`);
  url.searchParams.set('mode', mode);
  if (freq) url.searchParams.set('freq', freq);
  if (start) url.searchParams.set('start', start);
  if (date) url.searchParams.set('date', date);

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let attempt = 0;
  while (attempt < 2) {
    try {
      const response = await fetch(url.toString(), { headers });
      const status = response.status;
      const body = await safeJson(response);
      if (status >= 200 && status < 300 && !body?.error) {
        return { response: body as SeriesResponse, status };
      }
      const retryable = status === 429 || status >= 500;
      if (retryable && attempt === 0) {
        const delay = computeRetryAfter(response.headers, attempt);
        await delayMs(delay);
        attempt += 1;
        continue;
      }
      const code = (body?.error?.code as ErrorCode | undefined) ?? undefined;
      const message = mapError(code, status, body?.error?.message);
      return { error: message, status, headers: response.headers };
    } catch (err: any) {
      if (attempt === 0) {
        await delayMs(computeRetryAfter({}, attempt));
        attempt += 1;
        continue;
      }
      return { error: err.message || 'Unexpected error', status: 0 };
    }
  }
  return { error: 'Unable to reach DataSetIQ. Please try again.' };
}

export async function fetchProfile(apiKey?: string | null): Promise<{ profile?: MeResponse; error?: string }> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  try {
    const response = await fetch(`${BASE_URL}${ME_PATH}`, { headers });
    if (response.status === 401) {
      return { error: 'Invalid API Key. Please reconnect.' };
    }
    if (!response.ok) {
      return { error: 'Unable to fetch profile.' };
    }
    const body = await response.json();
    return { profile: body as MeResponse };
  } catch (err: any) {
    return { error: err.message || 'Unable to fetch profile.' };
  }
}

export async function searchSeries(apiKey: string | null, query: string, source?: string): Promise<SearchResult[]> {
  if (!query) return [];
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  let url = `${BASE_URL}${SEARCH_PATH}?q=${encodeURIComponent(query)}`;
  if (source) url += `&source=${encodeURIComponent(source)}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return [];
  }
  const body = await response.json();
  if (!Array.isArray(body)) return [];
  return body.map((item: any) => ({
    id: item.id,
    title: item.title,
    frequency: item.frequency,
    units: item.units,
    source: item.source,
  }));
}

export async function browseBySource(apiKey: string | null, source: string): Promise<SearchResult[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const url = `${BASE_URL}${SEARCH_PATH}?source=${encodeURIComponent(source)}&limit=50`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return [];
  }
  const body = await response.json();
  if (!Array.isArray(body)) return [];
  return body.map((item: any) => ({
    id: item.id,
    title: item.title,
    frequency: item.frequency,
    units: item.units,
    source: item.source,
  }));
}

export function mapError(code: ErrorCode | undefined, status: number, fallback?: string): string {
  if (code === 'NO_KEY') return CONNECT_MESSAGE;
  if (code === 'INVALID_KEY') return 'Invalid API Key. Reconnect at datasetiq.com/dashboard/api-keys';
  if (code === 'REVOKED_KEY') return 'API Key revoked. Get a new key at datasetiq.com/dashboard/api-keys';
  if (code === 'FREE_LIMIT') return 'Free plan limit reached. Upgrade at datasetiq.com/pricing';
  if (code === 'QUOTA_EXCEEDED') return 'Daily Quota Exceeded. Upgrade at datasetiq.com/pricing';
  if (code === 'PLAN_REQUIRED') return 'Upgrade required. Visit datasetiq.com/pricing';
  if (status === 429) return 'Rate limited. Please retry shortly.';
  if (status >= 500) return 'Server unavailable. Please retry.';
  return fallback || 'Unable to fetch data.';
}

function computeRetryAfter(headers: Headers | Record<string, string>, attempt: number): number {
  let retryAfter: string | null = null;
  if (headers instanceof Headers) {
    retryAfter = headers.get('Retry-After');
  } else if (headers) {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === 'retry-after');
    retryAfter = key ? String((headers as any)[key]) : null;
  }
  if (retryAfter) {
    const numeric = Number(retryAfter);
    if (!isNaN(numeric)) return numeric * 1000;
    const parsed = Date.parse(retryAfter);
    if (!isNaN(parsed)) {
      const diff = parsed - Date.now();
      return diff > 0 ? diff : 500 * Math.pow(2, attempt);
    }
  }
  return 500 * Math.pow(2, attempt);
}

function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch (_err) {
    return {};
  }
}
