export type DateFormat = 'short' | 'long' | 'relative';

function normalizeSeconds(timestamp: number): number {
  // Accept seconds or milliseconds; convert ms to seconds when it looks too big.
  return timestamp > 1_000_000_000_0 ? Math.floor(timestamp / 1000) : timestamp;
}

function formatRelative(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const targetSeconds = normalizeSeconds(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const seconds = targetSeconds - nowSeconds; // negative = past
  const abs = Math.abs(seconds);

  // Calendar-day snap (UTC) to keep "yesterday" stable around midnight drift.
  const targetDate = new Date(targetSeconds * 1000);
  const nowDate = new Date(nowSeconds * 1000);
  const targetDayStart = Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()) / 1000;
  const nowDayStart = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()) / 1000;
  const dayDelta = Math.floor((targetDayStart - nowDayStart) / 86400); // negative past days

  if (dayDelta === 0) {
    return rtf.format(0, 'day');
  }
  if (dayDelta === -1) {
    return 'yesterday';
  }

  // Snap very small differences to "now"
  if (Math.abs(seconds) < 5) {
    console.log('[formatRelative] near-now', { timestamp, seconds, result: 'now' });
    return rtf.format(0, 'second');
  }

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30.44 * day;
  const year = 365.25 * day;

  const entries: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [minute, 'second'],
    [hour, 'minute'],
    [day, 'hour'],
    [week, 'day'],
    [month, 'week'],
    [year, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];

  for (const [threshold, unit] of entries) {
    if (abs < threshold) {
      const divisor =
        unit === 'second' ? 1 :
        unit === 'minute' ? minute :
        unit === 'hour' ? hour :
        unit === 'day' ? day :
        unit === 'week' ? week :
        unit === 'month' ? month : year;

      const raw = seconds / divisor;
      // Use standard rounding so ~1.6 days -> 2 days, ~1.4 days -> 1 day
      const value = Math.round(raw);
      const result = rtf.format(value, unit);
      console.log('[formatRelative] formatted', { timestamp, seconds, unit, raw, value, result });
      return result;
    }
  }

  // Fallback (should never hit because last division is Infinity)
  const fallback = rtf.format(Math.round(seconds / year), 'year');
  console.log('[formatRelative] fallback', { timestamp, seconds: Math.round(seconds), result: fallback });
  return fallback;
}

export function formatDate(
  timestamp: number,
  format: DateFormat = 'short',
  options?: { includeTime?: boolean }
): string {
  if (!timestamp) return '';

  const seconds = normalizeSeconds(timestamp);
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return '';

  if (format === 'relative') {
    console.log('[formatDate] relative', {
      timestamp,
      normalizedSeconds: seconds,
      nowSeconds: Math.floor(Date.now() / 1000),
      iso: date.toISOString(),
    });
    return formatRelative(seconds);
  }

  const timeZone: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };
  const dateOpts: Intl.DateTimeFormatOptions =
    format === 'long'
      ? {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          ...(options?.includeTime
            ? { hour: '2-digit', minute: '2-digit' }
            : {}),
        }
      : {};

  return date.toLocaleDateString(undefined, { ...dateOpts, ...timeZone });
}

