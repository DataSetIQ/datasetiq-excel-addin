import {
  buildArrayResult,
  CONNECT_MESSAGE,
  fetchSeries,
  mapError,
  normalizeDateInput,
  normalizeOptionalString,
} from '../shared/api';
import { getStoredApiKey } from '../shared/storage';

// Type declaration for Office.js global
declare const CustomFunctions: any;

async function withApiKey(): Promise<{ apiKey: string | null; supported: boolean }> {
  const { key, supported } = await getStoredApiKey();
  return { apiKey: key, supported };
}

async function DSIQ(seriesId: string, frequency?: string, startDate?: any): Promise<any[][] | string> {
  const series = normalizeOptionalString(seriesId);
  if (!series) {
    throw new Error('series_id is required.');
  }
  const { apiKey, supported } = await withApiKey();
  if (!supported) return CONNECT_MESSAGE;
  const freq = normalizeOptionalString(frequency);
  const start = normalizeDateInput(startDate);
  const { response, error } = await fetchSeries({
    seriesId: series,
    mode: 'table',
    freq,
    start,
    apiKey,
  });
  if (error) {
    throw new Error(error);
  }
  const data = response?.data ?? [];
  return buildArrayResult(data);
}

async function DSIQ_LATEST(seriesId: string): Promise<number | string> {
  const series = normalizeOptionalString(seriesId);
  if (!series) throw new Error('series_id is required.');
  const { apiKey, supported } = await withApiKey();
  if (!supported) return CONNECT_MESSAGE;
  const { response, error, status } = await fetchSeries({
    seriesId: series,
    mode: 'latest',
    apiKey,
  });
  if (error) {
    throw new Error(error);
  }
  if (typeof response?.scalar === 'undefined') {
    throw new Error(mapError(undefined, status || 0, 'Value not available.'));
  }
  return response.scalar;
}

async function DSIQ_VALUE(seriesId: string, date: any): Promise<number | string> {
  const normalizedDate = normalizeDateInput(date);
  if (!normalizedDate) {
    throw new Error('date is required.');
  }
  const series = normalizeOptionalString(seriesId);
  if (!series) throw new Error('series_id is required.');
  const { apiKey, supported } = await withApiKey();
  if (!supported) return CONNECT_MESSAGE;
  const { response, error, status } = await fetchSeries({
    seriesId: series,
    mode: 'value',
    date: normalizedDate,
    apiKey,
  });
  if (error) {
    throw new Error(error);
  }
  if (typeof response?.scalar === 'undefined') {
    throw new Error(mapError(undefined, status || 0, 'Value not available.'));
  }
  return response.scalar;
}

async function DSIQ_YOY(seriesId: string): Promise<number | string> {
  const series = normalizeOptionalString(seriesId);
  if (!series) throw new Error('series_id is required.');
  const { apiKey, supported } = await withApiKey();
  if (!supported) return CONNECT_MESSAGE;
  const { response, error, status } = await fetchSeries({
    seriesId: series,
    mode: 'yoy',
    apiKey,
  });
  if (error) {
    throw new Error(error);
  }
  if (typeof response?.scalar === 'undefined') {
    throw new Error(mapError(undefined, status || 0, 'Value not available.'));
  }
  return response.scalar;
}

async function DSIQ_META(seriesId: string, field: string): Promise<string> {
  const series = normalizeOptionalString(seriesId);
  const normalizedField = normalizeOptionalString(field);
  if (!series) throw new Error('series_id is required.');
  if (!normalizedField) throw new Error('field is required.');
  const { apiKey, supported } = await withApiKey();
  if (!supported) return CONNECT_MESSAGE;
  const { response, error } = await fetchSeries({
    seriesId: series,
    mode: 'meta',
    apiKey,
  });
  if (error) {
    throw new Error(error);
  }
  const meta = response?.meta ?? {};
  if (!(normalizedField in meta)) {
    throw new Error(`Metadata "${normalizedField}" not found.`);
  }
  // @ts-expect-error dynamic access
  return meta[normalizedField];
}

// Associate functions for Excel runtime.
if (typeof CustomFunctions !== 'undefined') {
  CustomFunctions.associate('DSIQ', DSIQ);
  CustomFunctions.associate('DSIQ_LATEST', DSIQ_LATEST);
  CustomFunctions.associate('DSIQ_VALUE', DSIQ_VALUE);
  CustomFunctions.associate('DSIQ_YOY', DSIQ_YOY);
  CustomFunctions.associate('DSIQ_META', DSIQ_META);
}

export { DSIQ, DSIQ_LATEST, DSIQ_VALUE, DSIQ_YOY, DSIQ_META };
