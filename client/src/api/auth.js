/**
 * client/src/api/auth.js
 * 
 * Authentication client communicating with /api/auth.
 * Preserves mock fallback when USE_MOCKS is enabled.
 */

import { apiFetch, USE_MOCKS, setTokens, clearTokens } from './client.js';

const MOCK_CAREGIVER = {
  id: "cg-101",
  name: "Sunita Sharma",
  email: "sunita.caregiver@example.com",
  phone: "+91 98111 22233",
  role: "Primary Caregiver"
};

export async function login({ email, password }) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 100));
    const token = "mock-jwt-access-token-medguard";
    setTokens(token, "mock-refresh-token");
    localStorage.setItem("medguard_user", JSON.stringify(MOCK_CAREGIVER));
    return { user: MOCK_CAREGIVER, token };
  }

  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const accessToken = result.tokens?.accessToken || result.accessToken;
  const refreshToken = result.tokens?.refreshToken || result.refreshToken;

  setTokens(accessToken, refreshToken);
  if (result.user) {
    localStorage.setItem("medguard_user", JSON.stringify(result.user));
  }
  return { user: result.user, token: accessToken, tokens: { accessToken, refreshToken } };
}

export async function register({ name, email, password, phone, language = 'en' }) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 100));
    const newUser = {
      id: "cg-" + Date.now(),
      name,
      email,
      phone: phone || "+91 98000 00000",
      role: "Primary Caregiver"
    };
    const token = "mock-jwt-access-token-medguard";
    setTokens(token, "mock-refresh-token");
    localStorage.setItem("medguard_user", JSON.stringify(newUser));
    return { user: newUser, token, tokens: { accessToken: token, refreshToken: "mock-refresh-token" } };
  }

  const result = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone, language })
  });

  const accessToken = result.tokens?.accessToken || result.accessToken;
  const refreshToken = result.tokens?.refreshToken || result.refreshToken;

  setTokens(accessToken, refreshToken);
  if (result.user) {
    localStorage.setItem("medguard_user", JSON.stringify(result.user));
  }
  return { user: result.user, token: accessToken, tokens: { accessToken, refreshToken } };
}

export async function getCurrentUser() {
  if (typeof localStorage === 'undefined') return MOCK_CAREGIVER;
  const cached = localStorage.getItem("medguard_user");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return MOCK_CAREGIVER;
    }
  }
  return MOCK_CAREGIVER;
}

export async function logout() {
  if (!USE_MOCKS) {
    const refreshToken = localStorage.getItem('medguard_refresh_token');
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    } catch (err) {
      // Even if network fails, clear local tokens
      console.warn("Logout request error", err.message);
    }
  }
  clearTokens();
}

export async function deleteAccount(password) {
  if (USE_MOCKS) {
    clearTokens();
    return { success: true };
  }

  const result = await apiFetch('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password: password || 'MedGuard2026!' })
  });
  clearTokens();
  return result;
}
