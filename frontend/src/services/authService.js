/**
 * authService.js
 * Service layer for all authentication API calls.
 * Base URL is pulled from the VITE_API_BASE_URL environment variable.
 * No backend logic lives here — these are structured stubs ready to call
 * the Express REST endpoints once the backend is wired up.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Build default JSON headers, optionally including an Authorization header.
 * @param {string|null} token
 * @returns {HeadersInit}
 */
const jsonHeaders = (token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

/**
 * Parse a JSON response and throw a normalised error if the status is not OK.
 * @param {Response} res
 * @returns {Promise<any>}
 */
const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log in with email + password.
 * @param {{ email: string, password: string, rememberMe?: boolean }} credentials
 * @returns {Promise<{ token: string, user: object }>}
 */
export const login = async ({ email, password, rememberMe = false }) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password, rememberMe }),
  });
  return parseResponse(res);
};

/**
 * Register a new account.
 * @param {{ fullName: string, email: string, password: string }} payload
 * @returns {Promise<{ token: string, user: object }>}
 */
export const register = async ({ fullName, email, password }) => {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name: fullName, email, password }),
  });
  return parseResponse(res);
};

/**
 * Send a password-reset email.
 * @param {{ email: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export const forgotPassword = async ({ email }) => {
  const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseResponse(res);
};

/**
 * Log out the current user — clears local/session storage.
 * The backend endpoint (if it exists for token invalidation) is called here.
 * @param {string} token
 * @returns {Promise<void>}
 */
export const logout = async (token) => {
  try {
    if (token) {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: jsonHeaders(token),
      });
    }
  } catch {
    // Silently swallow network errors on logout
  } finally {
    localStorage.removeItem('sitemind_token');
    localStorage.removeItem('sitemind_user');
    sessionStorage.removeItem('sitemind_token');
    sessionStorage.removeItem('sitemind_user');
  }
};

/**
 * Refresh the JWT using a stored refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ token: string }>}
 */
export const refreshToken = async (refreshToken) => {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ refreshToken }),
  });
  return parseResponse(res);
};
