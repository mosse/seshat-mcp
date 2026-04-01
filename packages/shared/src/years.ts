/**
 * Year display utilities.
 *
 * Internal convention: BCE years are stored as negative integers.
 * Year 0 = 1 BCE (astronomical year numbering).
 */

/** Format a stored year as a human-readable string. */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year === 0) return '1 BCE';
  return `${year} CE`;
}

/** Convert a century value (e.g. -500) to a display label. */
export function formatCentury(century: number): string {
  if (century < 0) {
    const ordinal = Math.abs(century) / 100;
    return `${toOrdinal(ordinal)} century BCE`;
  }
  if (century === 0) return '1st century BCE';
  const ordinal = century / 100;
  return `${toOrdinal(ordinal)} century CE`;
}

/** Convert century value to a short label for chart axes. */
export function formatCenturyShort(century: number): string {
  if (century < 0) return `${Math.abs(century)} BCE`;
  if (century === 0) return '0';
  return `${century} CE`;
}

function toOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
