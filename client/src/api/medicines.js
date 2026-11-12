/**
 * client/src/api/medicines.js
 * 
 * Medicine search and normalization client communicating with /api/medicines.
 * Preserves mock fallback when USE_MOCKS is enabled.
 */

import { apiFetch, USE_MOCKS } from './client.js';
import { mockBrandsDatabase, mockOcrExtractResults } from '../mocks/medicines.mock.js';

export async function searchMedicines(query) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 60));
    if (!query || query.trim().length === 0) {
      return mockBrandsDatabase.slice(0, 5);
    }
    const q = query.toLowerCase().trim();
    return mockBrandsDatabase.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  return await apiFetch(`/medicines/search?q=${encodeURIComponent(query.trim())}`);
}

export async function normalizeOcr(rawInputs) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 120));
    return mockOcrExtractResults;
  }

  const queries = Array.isArray(rawInputs)
    ? rawInputs
    : typeof rawInputs === 'string'
    ? rawInputs.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  return await apiFetch('/medicines/normalize', {
    method: 'POST',
    body: JSON.stringify({ queries })
  });
}
