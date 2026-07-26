/**
 * validation.js — shared field-level validators for auth and website forms.
 */

/** Email regex — simple RFC-compatible check. */
const EMAIL_RE = /\S+@\S+\.\S+/;

/** Domain regex — plain hostnames without protocol or path. */
const DOMAIN_RE = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * Normalise a raw URL/domain input to a plain hostname.
 * Strips protocol, trailing slashes, and port numbers.
 * @param {string} raw
 * @returns {string}
 */
export const normaliseDomain = (raw) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];

/**
 * Validate an email address.
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
export const validateEmail = (email) => {
  if (!email?.trim()) return { valid: false, message: 'Email is required' };
  if (!EMAIL_RE.test(email)) return { valid: false, message: 'Enter a valid email address' };
  return { valid: true, message: '' };
};

/**
 * Validate a domain/URL input, normalising it first.
 * @param {string} value
 * @returns {{ valid: boolean, message: string, normalised?: string }}
 */
export const validateDomain = (value) => {
  const cleaned = normaliseDomain(value);
  if (!cleaned) return { valid: false, message: '' };
  if (DOMAIN_RE.test(cleaned)) return { valid: true, message: 'Valid domain', normalised: cleaned };
  return { valid: false, message: 'Enter a valid domain (e.g. example.com)' };
};

/**
 * Validate a password against the five strength criteria.
 * @param {string} password
 * @returns {{ valid: boolean, score: number, message: string }}
 */
export const validatePassword = (password) => {
  if (!password) return { valid: false, score: 0, message: 'Password is required' };
  if (password.length < 8) return { valid: false, score: 1, message: 'Must be at least 8 characters' };
  return { valid: true, score: computePasswordScore(password), message: '' };
};

/**
 * Compute a 0–5 password strength score.
 * @param {string} p
 * @returns {number}
 */
export const computePasswordScore = (p) => {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score;
};
