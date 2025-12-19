import { describe, expect, it } from 'vitest';
import { buildArrayResult, normalizeDateInput, normalizeOptionalString } from '../src/shared/api';

describe('normalizeOptionalString', () => {
  it('handles nullish and trims', () => {
    expect(normalizeOptionalString(null)).toBeUndefined();
    expect(normalizeOptionalString(' abc ')).toBe('abc');
  });
});

describe('normalizeDateInput', () => {
  it('normalizes dates and numbers', () => {
    const d = new Date(Date.UTC(2024, 0, 1));
    expect(normalizeDateInput(d)).toBe('2024-01-01');
    // Excel serial 45292 equals 2024-01-01
    expect(normalizeDateInput(45292)).toBe('2024-01-01');
  });
});

describe('buildArrayResult', () => {
  it('adds header and sorts', () => {
    const result = buildArrayResult([
      ['2023-01-01', 1],
      ['2024-01-01', 2],
    ]);
    expect(result[0]).toEqual(['Date', 'Value']);
    expect(result[1][0]).toBe('2024-01-01');
  });
});
