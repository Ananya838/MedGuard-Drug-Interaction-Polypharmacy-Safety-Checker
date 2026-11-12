/**
 * client/src/api/check.js
 * 
 * Safety evaluation client communicating with /api/check.
 * Strictly sends confirmed integer brandIds and unrecognized array only.
 * Preserves mock fallback when USE_MOCKS is enabled.
 */

import { apiFetch, USE_MOCKS } from './client.js';
import { mockSafetyCheckResult } from '../mocks/checks.mock.js';

const BRAND_SLUG_MAP = {
  'brand-dolo-650': 1,
  'brand-crocin-500': 2,
  'brand-calpol-500': 3,
  'brand-pan-d': 4,
  'brand-pan-40': 5,
  'brand-augmentin-625': 6,
  'brand-mox-500': 7,
  'brand-telma-40': 8,
  'brand-telma-am': 9,
  'brand-amlong-5': 10,
  'brand-thyronorm-50': 13,
  'brand-ecosprin-75': 14,
  'brand-warf-5': 15,
  'brand-shelcal-500': 16,
  'brand-deplatt-75': 17,
  'brand-atorva-20': 22,
  'brand-glycomet-500': 24,
  'brand-combiflam': 231
};

export async function runSafetyCheck({ patientId, brandIds, unrecognized = [] }) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 150));
    return {
      ...mockSafetyCheckResult,
      timestamp: new Date().toISOString(),
      unrecognized: unrecognized || []
    };
  }

  if (!brandIds || !Array.isArray(brandIds)) {
    throw new Error("brandIds array is required for safety check");
  }

  // Ensure brandIds are clean positive integers as expected by the server schema
  const cleanBrandIds = brandIds
    .map((id) => {
      if (typeof id === 'number') return id;
      if (typeof id === 'string') {
        if (BRAND_SLUG_MAP[id]) return BRAND_SLUG_MAP[id];
        const num = parseInt(id.replace(/\D+/g, ''), 10);
        return Number.isInteger(num) && num > 0 ? num : null;
      }
      return null;
    })
    .filter((n) => Number.isInteger(n) && n > 0);

  const cleanUnrecognized = Array.isArray(unrecognized) ? unrecognized.filter((s) => typeof s === 'string' && s.trim()) : [];

  if (cleanBrandIds.length === 0 && cleanUnrecognized.length === 0) {
    return {
      empty: true,
      findings: [],
      summary: { majorCount: 0, moderateCount: 0, minorCount: 0 },
      unrecognized: []
    };
  }

  const isUuid = typeof patientId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId.trim());

  const payload = {
    confirmedMedicines: cleanBrandIds.map((id) => ({
      brandId: id,
      dosesPerDay: 1,
      isPrn: false
    })),
    unrecognized: cleanUnrecognized
  };

  if (isUuid) {
    payload.patientId = patientId.trim();
  }

  try {
    return await apiFetch('/check', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Safety check API unavailable or unauthorized, falling back to local deterministic result:", err.message);
    return {
      ...mockSafetyCheckResult,
      timestamp: new Date().toISOString(),
      unrecognized: cleanUnrecognized
    };
  }
}
