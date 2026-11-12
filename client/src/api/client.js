/**
 * client/src/api/client.js
 * 
 * Central HTTP client for MedGuard frontend.
 * Supports:
 * - Base URL switching (defaults to http://localhost:5000/api)
 * - Feature flag USE_MOCKS for offline UI work
 * - Automatic Authorization header injection
 * - Automatic JWT refresh token rotation on 401
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : 'http://localhost:5000/api';

export const USE_MOCKS = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCKS === 'true');

export function getAuthToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('medguard_token');
}

export function getRefreshToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('medguard_refresh_token');
}

export function setTokens(accessToken, refreshToken) {
  if (typeof localStorage === 'undefined') return;
  if (accessToken) localStorage.setItem('medguard_token', accessToken);
  if (refreshToken) localStorage.setItem('medguard_refresh_token', refreshToken);
}

export function clearTokens() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('medguard_token');
  localStorage.removeItem('medguard_refresh_token');
  localStorage.removeItem('medguard_user');
}

/**
 * Attempts to rotate the refresh token when access token expires.
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json();
    if (res.ok && data.success && data.data?.accessToken) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data.accessToken;
    }
  } catch (err) {
    console.error("Token refresh failed", err);
  }

  clearTokens();
  return null;
}

/**
 * Standard fetch wrapper with authorization and auto-refresh.
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers
  });

  // If 401 Unauthorized, attempt token refresh and retry once
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }

  // Handle binary streams (e.g. PDF report)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    if (!response.ok) throw new Error("Failed to download PDF report");
    return response.blob();
  }

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMessage = json.error?.message || json.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = json.error?.details || null;
    throw error;
  }

  return json.data;
}

