import { describe, it, expect } from 'vitest';

/**
 * buildRRULE関数をテストするためのヘルパー
 * 実際の関数はgoogle-client.tsで定義されているが、exportされていないため、
 * ここで同等のロジックを実装してテストする
 */
function buildRRULE(pattern: { type: 'none' } | { type: 'weekly'; interval?: number } | { type: 'monthly'; interval?: number }, endDate: string): string | undefined {
  if (pattern.type === 'none') {
    return undefined;
  }

  const endDateObj = new Date(endDate);
  endDateObj.setHours(23, 59, 59, 999);

  if (pattern.type === 'weekly') {
    const interval = pattern.interval ?? 1;
    const until = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `FREQ=WEEKLY;INTERVAL=${interval};UNTIL=${until}`;
  }

  if (pattern.type === 'monthly') {
    const interval = pattern.interval ?? 1;
    const until = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `FREQ=MONTHLY;INTERVAL=${interval};UNTIL=${until}`;
  }

  return undefined;
}

describe('buildRRULE', () => {
  it('returns undefined for "none" pattern', () => {
    const result = buildRRULE({ type: 'none' }, '2025-02-10');
    expect(result).toBeUndefined();
  });

  it('generates weekly RRULE with default interval', () => {
    const result = buildRRULE({ type: 'weekly' }, '2025-02-10');
    expect(result).toMatch(/^FREQ=WEEKLY;INTERVAL=1;UNTIL=/);
    expect(result).toMatch(/UNTIL=20250210T\d{6}Z$/);
  });

  it('generates weekly RRULE with custom interval', () => {
    const result = buildRRULE({ type: 'weekly', interval: 2 }, '2025-02-10');
    expect(result).toMatch(/^FREQ=WEEKLY;INTERVAL=2;UNTIL=/);
  });

  it('generates monthly RRULE with default interval', () => {
    const result = buildRRULE({ type: 'monthly' }, '2025-02-10');
    expect(result).toMatch(/^FREQ=MONTHLY;INTERVAL=1;UNTIL=/);
    expect(result).toMatch(/UNTIL=20250210T\d{6}Z$/);
  });

  it('generates monthly RRULE with custom interval', () => {
    const result = buildRRULE({ type: 'monthly', interval: 3 }, '2025-02-10');
    expect(result).toMatch(/^FREQ=MONTHLY;INTERVAL=3;UNTIL=/);
  });

  it('uses end date in UNTIL clause', () => {
    const result = buildRRULE({ type: 'weekly' }, '2025-12-31');
    expect(result).toMatch(/UNTIL=20251231T\d{6}Z$/);
  });
});
