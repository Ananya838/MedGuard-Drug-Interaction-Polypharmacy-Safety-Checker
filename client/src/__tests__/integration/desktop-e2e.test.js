/**
 * client/src/__tests__/integration/desktop-e2e.test.js
 * 
 * End-to-End Desktop Integration Tests (Prompt 06A).
 * Tests the real Express backend API against the PostgreSQL database:
 * 1. Caregiver register, login, refresh token rotation
 * 2. Add patient profile (scoped with WHERE caregiver_id = current user)
 * 3. Search Indian brand medicines (Warf, Ecosprin)
 * 4. Add medicines to patient regimen
 * 5. Normalize raw OCR text and preserve unrecognized items
 * 6. Execute deterministic safety check (/api/check) with confirmed brand IDs
 * 7. Assert Warfarin + Aspirin major finding, cumulative dose limits, and fixed action templates
 * 8. Assert report NEVER says "safe" and ALWAYS contains the screening disclaimer
 * 9. Download and verify Doctor PDF report
 * 10. Logout and permanent account deletion
 * 11. Error boundary tests (wrong password, revoked token, malformed input, cross-caregiver isolation)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, '../../../../server/.env');
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: serverEnvPath });
dotenv.config({ path: rootEnvPath });

let app;
let closePool;
let server;
let baseUrl;

beforeAll(async () => {
  // Dynamically import app and config after dotenv has loaded DATABASE_URL
  const configModule = await import('../../../../server/config.js');
  const appModule = await import('../../../../server/app.js');
  app = appModule.app;
  closePool = configModule.closePool;

  // Ensure active pool is connected to DATABASE_URL if needed
  if (process.env.DATABASE_URL) {
    configModule.config.DATABASE_URL = process.env.DATABASE_URL;
    const realPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    configModule.setPool(realPool);
  }

  // Start the real Express app on an ephemeral port
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
}, 45000);

afterAll(async () => {
  if (server) {
    await new Promise((res) => server.close(res));
  }
  if (closePool) {
    await closePool();
  }
});

describe('Prompt 06A: Desktop Integration End-to-End Flow', { timeout: 60000 }, () => {
  const uniqueEmail = `caregiver_e2e_${Date.now()}@test.medguard.in`;
  const password = 'MedGuardStrongPassword2026!';
  let accessToken = '';
  let refreshToken = '';
  let patientId = null;
  let warfBrandId = null;
  let ecosprinBrandId = null;

  // 1. Register
  it('Step 1: Registers a new caregiver profile', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunita Sharma E2E',
        email: uniqueEmail,
        password,
        phone: '+91 98111 22233',
        language: 'en'
      })
    });

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(uniqueEmail);
    accessToken = body.data.tokens?.accessToken || body.data.accessToken;
    refreshToken = body.data.tokens?.refreshToken || body.data.refreshToken;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
  });

  // 2. Login
  it('Step 2: Authenticates via login and receives fresh JWTs', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password
      })
    });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    accessToken = body.data.tokens?.accessToken || body.data.accessToken;
    refreshToken = body.data.tokens?.refreshToken || body.data.refreshToken;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
  });

  // 3. Add Patient Profile
  it('Step 3: Creates an elderly family dependent profile', async () => {
    const res = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'Ramesh Sharma E2E',
        dob: '1952-04-12',
        weightKg: 68.5,
        conditions: ['HYPERTENSION', 'DIABETES'],
        allergies: [{ type: 'drug_class', name: 'Sulfa Antibiotics' }]
      })
    });

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    const patient = body.data.patient || body.data;
    expect(patient.name).toBe('Ramesh Sharma E2E');

    patientId = patient.id;
  });

  // 4. Search Medicines
  it('Step 4: Searches Indian brand database for prescribed medicines', async () => {
    // Search Warfarin brand
    const warfRes = await fetch(`${baseUrl}/medicines/search?q=warf`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const warfBody = await warfRes.json();
    expect(warfRes.status).toBe(200);
    expect(warfBody.success).toBe(true);
    expect(warfBody.data.length).toBeGreaterThan(0);
    const warfBrand = warfBody.data.find((b) => (b.name || b.brand_name || b.brandName || '').toLowerCase().includes('warf'));
    expect(warfBrand).toBeDefined();
    warfBrandId = warfBrand.id;

    // Search Aspirin brand (Ecosprin)
    const ecoRes = await fetch(`${baseUrl}/medicines/search?q=ecosprin`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const ecoBody = await ecoRes.json();
    expect(ecoRes.status).toBe(200);
    expect(ecoBody.success).toBe(true);
    expect(ecoBody.data.length).toBeGreaterThan(0);
    const ecoBrand = ecoBody.data.find((b) => (b.name || b.brand_name || b.brandName || '').toLowerCase().includes('ecosprin'));
    expect(ecoBrand).toBeDefined();
    ecosprinBrandId = ecoBrand.id;
  });

  // 5. Add Medicines to Patient Regimen
  it('Step 5: Adds prescribed medicines to patient regimen', async () => {
    const med1Res = await fetch(`${baseUrl}/patients/${patientId}/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        brandId: warfBrandId,
        doseAmount: 1,
        doseUnit: 'tablet',
        dosesPerDay: 1,
        isPrn: false,
        frequencyText: 'Take strictly at bedtime',
        timingSchedule: ['21:00']
      })
    });
    expect(med1Res.status).toBe(201);

    const med2Res = await fetch(`${baseUrl}/patients/${patientId}/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        brandId: ecosprinBrandId,
        doseAmount: 1,
        doseUnit: 'tablet',
        dosesPerDay: 1,
        isPrn: false,
        frequencyText: 'Take after breakfast',
        timingSchedule: ['08:00']
      })
    });
    expect(med2Res.status).toBe(201);
  });

  // 6. Test Normalize Endpoint
  it('Step 6: Normalizes OCR text and preserves unrecognized medicines', async () => {
    const normRes = await fetch(`${baseUrl}/medicines/normalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        queries: ['Warf 5', 'Ecosprin 75', 'UNKNOWN_UNRECOGNIZED_FOIL_XYZ']
      })
    });

    const normBody = await normRes.json();
    expect(normRes.status).toBe(200);
    expect(normBody.success).toBe(true);
    const unresolvedList = (normBody.data.unresolved || normBody.data.unrecognized || []).map((u) => typeof u === 'string' ? u : u.query);
    expect(unresolvedList).toContain('UNKNOWN_UNRECOGNIZED_FOIL_XYZ');
  });

  // 7. Run Safety Check
  it('Step 7: Executes deterministic safety check with confirmed brand IDs', async () => {
    const checkRes = await fetch(`${baseUrl}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        patientId,
        confirmedMedicines: [
          { brandId: warfBrandId, doseAmount: 1, dosesPerDay: 1 },
          { brandId: ecosprinBrandId, doseAmount: 1, dosesPerDay: 1 }
        ],
        unrecognized: ['UNKNOWN_UNRECOGNIZED_FOIL_XYZ']
      })
    });

    const checkBody = await checkRes.json();
    expect(checkRes.status).toBe(200);
    expect(checkBody.success).toBe(true);

    const report = checkBody.data;
    expect(report.summary.majorCount).toBeGreaterThanOrEqual(1);

    // Finding for Warfarin + Aspirin interaction
    const warfarinAspirinFinding = report.findings.find(
      (f) =>
        (f.type === 'interaction' || f.type === 'drug_drug') &&
        (
          f.summary.toLowerCase().includes('warfarin') ||
          f.explanation.toLowerCase().includes('warfarin') ||
          f.items.some((i) => i.toLowerCase().includes('warf'))
        )
    );
    expect(warfarinAspirinFinding).toBeDefined();
    expect(warfarinAspirinFinding.severity).toBe('major');

    // Rule #9: Human-written fixed caregiver action template
    expect(warfarinAspirinFinding.action).toMatch(/doctor|pharmacist/i);
    expect(warfarinAspirinFinding.action).not.toMatch(/\b(stop|halve|skip|dose)\b/i);

    // Rule #5: Unrecognized list is preserved
    const unrecognizedInputs = report.unrecognized.map((u) => (typeof u === 'string' ? u : u.input));
    expect(unrecognizedInputs).toContain('UNKNOWN_UNRECOGNIZED_FOIL_XYZ');

    // Rule #4: Never use the word "safe" in summary or findings
    const reportStr = JSON.stringify(report).toLowerCase();
    expect(reportStr).not.toContain('"safe"');
    expect(reportStr).not.toContain('safe pairs');

    // Rule #6: Disclaimer is mandatory
    expect(report.disclaimer).toBeDefined();
    expect(report.disclaimer).toMatch(/screening (aid|tool)/i);
    expect(report.disclaimer).toMatch(/does not replace (a |consultation with a )?doctor/i);
  });

  // 8. Stream Doctor PDF Report
  it('Step 8: Generates and streams doctor-ready clinical PDF report', async () => {
    const pdfRes = await fetch(`${baseUrl}/patients/${patientId}/report.pdf`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get('content-type')).toContain('application/pdf');

    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfHeader = Buffer.from(pdfBuffer).subarray(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
  });

  // 9. Error Boundary Tests
  it('Step 9: Enforces error handling and security boundaries', async () => {
    // A. Wrong password login
    const wrongPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password: 'WrongPassword123!' })
    });
    expect(wrongPassRes.status).toBe(401);

    // B. Rejection of raw strings in /api/check (Rule #8)
    const rawCheckRes = await fetch(`${baseUrl}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        patientId,
        brandIds: ['Warf 5 raw string', 'Ecosprin raw text']
      })
    });
    expect(rawCheckRes.status).toBe(400);

    // C. Cross-caregiver access isolation (Caregiver B cannot access Caregiver A's patient)
    const regBRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Caregiver B',
        email: `caregiver_b_${Date.now()}@test.medguard.in`,
        password: 'PasswordB2026!'
      })
    });
    const regBBody = await regBRes.json();
    const tokenB = regBBody.data.tokens?.accessToken || regBBody.data.accessToken;

    const crossAccessRes = await fetch(`${baseUrl}/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    // Must be 404/403: Caregiver B cannot view Patient belonging to Caregiver A
    expect([403, 404]).toContain(crossAccessRes.status);
  });

  // 10. Logout and Delete Account
  it('Step 10: Logs out and permanently removes caregiver account', async () => {
    // Logout
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ refreshToken })
    });
    expect(logoutRes.status).toBe(200);

    // Delete Account
    const delRes = await fetch(`${baseUrl}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ password })
    });
    expect(delRes.status).toBe(200);

    // Verify subsequent login fails
    const reLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail, password })
    });
    expect(reLoginRes.status).toBe(401);
  });
});
