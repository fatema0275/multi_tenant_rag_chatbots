/**
 * format.js — shared formatting utilities used across the app.
 */

/**
 * Format an ISO date string into a short human-readable date.
 * e.g. "Jul 24, 2026"
 * @param {string|null} iso
 * @returns {string}
 */
export const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format an ISO date string into a short timestamp.
 * e.g. "Jul 24, 11:45 PM"
 * @param {string|null} iso
 * @returns {string}
 */
export const formatTimestamp = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number with locale-specific thousands separators.
 * @param {number} n
 * @returns {string}
 */
export const formatNumber = (n) => n.toLocaleString();

/**
 * Truncate a string to a given maximum length, appending ellipsis.
 * @param {string} str
 * @param {number} [maxLen=60]
 * @returns {string}
 */
export const truncate = (str, maxLen = 60) =>
  str?.length > maxLen ? `${str.slice(0, maxLen)}…` : str ?? '';

/**
 * Convert bytes to a human-readable string.
 * e.g. 1500 → "1.5 KB"
 * @param {number} bytes
 * @returns {string}
 */
export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
