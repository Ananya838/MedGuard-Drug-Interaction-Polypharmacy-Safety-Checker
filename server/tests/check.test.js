import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../app.js';
import { setPool } from '../config.js';
import { signAccessToken } from '../auth/jwt.js';

describe('Safety Engine Check Endpoint (/api/check)', () => {
  let server;
  let baseUrl;
  let validToken;

  const CAREGIVER_ID = 'caregiver-test-1';
  const SENIOR_PATIENT_ID = '11111111-1111-4111-8111-111111111111';
  const INVALID_DOB_PATIENT_ID = '22222222-2222-4222-8222-222222222222';
  const FUTURE_DOB_PATIENT_ID = '33333333-3333-4333-8333-333333333333';

  const mockBrands = [
    { id: 10, brand_name: 'Coumadin 5mg', ingredients: [{ id: 100, name: 'warfarin', strengthMg: 5 }] },
    { id: 20, brand_name: 'Disprin 325mg', ingredients: [{ id: 101, name: 'aspirin', strengthMg: 325 }] },
    { id: 30, brand_name: 'Calpol 500mg', ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 500 }] },
    { id: 40, brand_name: 'Amoxil 500mg', ingredients: [{ id: 11, name: 'amoxicillin', strengthMg: 500 }] },
    { id: 50, brand_name: 'EmptyBrand 100mg', ingredients: [] }, // Missing ingredient mappings
    { id: 60, brand_name: 'ZeroStrengthBrand', ingredients: [{ id: 99, name: 'filler', strengthMg: 0 }] }, // Invalid strength
    { id: 70, brand_name: 'Alprax 0.5mg', ingredients: [{ id: 37, name: 'alprazolam', strengthMg: 0.5 }] }, // Beers drug
  ];

  const mockInteractions = [
    {
      ingredientA: 100,
      ingredientB: 101,
      severity: 'major',
      summary: 'Combining Warfarin and Aspirin greatly increases the risk of serious bleeding.',
      explanation: 'Warfarin inhibits clotting factor synthesis while aspirin irreversibly inhibits platelet aggregation.',
      source: 'DDInter v2.0',
    },
  ];

  const mockBeersRules = [
    {
      ingredientId: 37,
      rationale: 'Benzodiazepines increase risk of falls, delirium, and fractures in older adults.',
      recommendation: 'Avoid in adults aged 65 and older.',
      severity: 'major',
      source: 'AGS Beers Criteria 2023',
    },
  ];

  const mockPatients = [
    {
      id: SENIOR_PATIENT_ID,
      caregiver_id: CAREGIVER_ID,
      name: 'Elderly Patient',
      dob: '1950-01-01', // ~76 years old
      weight_kg: 65,
      allergies: [],
      conditions: [],
    },
    {
      id: INVALID_DOB_PATIENT_ID,
      caregiver_id: CAREGIVER_ID,
      name: 'Invalid DOB Patient',
      dob: 'not-a-valid-date',
      weight_kg: 70,
      allergies: [],
      conditions: [],
    },
    {
      id: FUTURE_DOB_PATIENT_ID,
      caregiver_id: CAREGIVER_ID,
      name: 'Future DOB Patient',
      dob: '2099-01-01', // Future date
      weight_kg: 70,
      allergies: [],
      conditions: [],
    },
  ];

  const mockDbPool = {
    async query(sql, params = []) {
      const lowerSql = sql.toLowerCase().trim();

      // Patient lookup
      if (lowerSql.includes('from patients') && lowerSql.includes('where id = $1')) {
        const [patId, cgId] = params;
        const found = mockPatients.filter((p) => p.id === patId && p.caregiver_id === cgId);
        return { rows: found };
      }

      // Brand catalog check: SELECT b.id, b.brand_name FROM brands b WHERE b.id = ANY($1::int[])
      if (lowerSql.includes('from brands b') && lowerSql.includes('select b.id, b.brand_name')) {
        const brandIds = params[0] || [];
        const rows = mockBrands
          .filter((b) => brandIds.includes(b.id))
          .map((b) => ({ id: b.id, brand_name: b.brand_name }));
        return { rows };
      }

      // Brand ingredients join query
      if (lowerSql.includes('from brands b') && lowerSql.includes('join brand_ingredients bi')) {
        const brandIds = params[0] || [];
        const rows = [];
        for (const b of mockBrands) {
          if (brandIds.includes(b.id)) {
            for (const ing of b.ingredients) {
              rows.push({
                brand_id: b.id,
                brand_name: b.brand_name,
                ingredient_id: ing.id,
                ingredient_name: ing.name,
                strength_mg: ing.strengthMg,
              });
            }
          }
        }
        return { rows };
      }

      // Scoped interactions
      if (lowerSql.includes('from interactions') && lowerSql.includes('ingredient_a = any')) {
        const ingIds = params[0] || [];
        const matches = mockInteractions.filter(
          (i) => ingIds.includes(i.ingredientA) && ingIds.includes(i.ingredientB)
        );
        return { rows: matches };
      }

      // Scoped Beers rules
      if (lowerSql.includes('from beers_rules') && lowerSql.includes('ingredient_id = any')) {
        const ingIds = params[0] || [];
        const matches = mockBeersRules.filter((r) => ingIds.includes(r.ingredientId));
        return { rows: matches };
      }

      return { rows: [] };
    },
  };

  before(async () => {
    setPool(mockDbPool);
    validToken = signAccessToken({ id: CAREGIVER_ID, email: 'test@example.com', name: 'Tester', language: 'en' });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/check: requires authentication', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedMedicines: [{ brandId: 10 }] }),
    });
    assert.equal(res.status, 401);
  });

  test('POST /api/check: rejects empty payload', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({ confirmedMedicines: [], unrecognized: [] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/check: rejects unexpected top-level fields', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10 }],
        unrecognized: [],
        maliciousExtraField: 'attack_vector',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.match(body.error.message, /Unexpected field in request: "maliciousExtraField"/);
  });

  test('POST /api/check: rejects malformed patientId', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        patientId: 'not-a-valid-uuid',
        confirmedMedicines: [{ brandId: 10 }],
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.match(body.error.message, /valid UUID string/);
  });

  test('POST /api/check: STRICT INPUT BOUNDARY rejects raw text, missing or non-integer brandId', async () => {
    // 1. Raw text object without brandId
    const res1 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandName: 'Coumadin 5mg' }],
      }),
    });
    assert.equal(res1.status, 400);
    const body1 = await res1.json();
    assert.equal(body1.error.code, 'VALIDATION_ERROR');

    // 2. brandId as null
    const res2 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: null }],
      }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'VALIDATION_ERROR');

    // 3. brandId as string
    const res3 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: '10' }],
      }),
    });
    assert.equal(res3.status, 400);
    const body3 = await res3.json();
    assert.equal(body3.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/check: rejects medicine entries with unexpected fields or invalid dosages', async () => {
    // Unexpected field in medicine item
    const res1 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10, unconfirmedName: 'Warfarin' }],
      }),
    });
    assert.equal(res1.status, 400);
    const body1 = await res1.json();
    assert.equal(body1.error.code, 'VALIDATION_ERROR');
    assert.match(body1.error.message, /Unexpected field "unconfirmedName"/);

    // Negative dosesPerDay
    const res2 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10, dosesPerDay: -2 }],
      }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'VALIDATION_ERROR');

    // Zero/negative doseAmount
    const res3 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10, doseAmount: 0 }],
      }),
    });
    assert.equal(res3.status, 400);
    const body3 = await res3.json();
    assert.equal(body3.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/check: validates unrecognized array and rejects non-strings or empty/whitespace items', async () => {
    // Array containing a number
    const res1 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10 }],
        unrecognized: [12345],
      }),
    });
    assert.equal(res1.status, 400);
    const body1 = await res1.json();
    assert.equal(body1.error.code, 'VALIDATION_ERROR');
    assert.match(body1.error.message, /must be a non-empty string/);

    // Array containing empty string or whitespace
    const res2 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10 }],
        unrecognized: ['   '],
      }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'VALIDATION_ERROR');

    // Array containing object
    const res3 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10 }],
        unrecognized: [{ raw: 'HerbalPacket' }],
      }),
    });
    assert.equal(res3.status, 400);
    const body3 = await res3.json();
    assert.equal(body3.error.code, 'VALIDATION_ERROR');

    // Item exceeding 255 chars
    const res4 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 10 }],
        unrecognized: ['a'.repeat(256)],
      }),
    });
    assert.equal(res4.status, 400);
    const body4 = await res4.json();
    assert.equal(body4.error.code, 'VALIDATION_ERROR');
    assert.match(body4.error.message, /maximum length of 255 characters/);
  });

  test('POST /api/check: database validation rejects non-existent brand IDs', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 99999 }], // Does not exist in mockBrands
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.match(body.error.message, /Brand ID 99999 was not found in the medicine catalog/);
  });

  test('POST /api/check: database validation rejects brands with missing or invalid active ingredient mappings', async () => {
    // Brand 50 exists in brands table but has 0 ingredients mapped
    const res1 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 50 }],
      }),
    });
    assert.equal(res1.status, 400);
    const body1 = await res1.json();
    assert.equal(body1.error.code, 'VALIDATION_ERROR');
    assert.match(body1.error.message, /missing or invalid active ingredient mappings/);

    // Brand 60 has ingredient with strength_mg = 0
    const res2 = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 60 }],
      }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'VALIDATION_ERROR');
    assert.match(body2.error.message, /missing or invalid active ingredient mappings/);
  });

  test('POST /api/check: handles unknown age safely without defaulting to 50 (Beers criteria does not trigger)', async () => {
    // 1. Anonymous check with Beers medication (Alprax 0.5mg / alprazolam) -> age is null, Beers MUST NOT trigger
    const anonRes = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [{ brandId: 70, dosesPerDay: 1 }], // Alprax (alprazolam)
      }),
    });
    assert.equal(anonRes.status, 200);
    const anonBody = await anonRes.json();
    assert.equal(anonBody.success, true);
    // Beers finding must NOT be present
    const beersFinding = anonBody.data.findings.find((f) => f.type === 'beers');
    assert.equal(beersFinding, undefined, 'Beers criteria must NOT trigger when age is unknown');

    // 2. Patient with invalid DOB string -> age is null, Beers MUST NOT trigger
    const invalidDobRes = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        patientId: INVALID_DOB_PATIENT_ID,
        confirmedMedicines: [{ brandId: 70, dosesPerDay: 1 }],
      }),
    });
    assert.equal(invalidDobRes.status, 200);
    const invalidDobBody = await invalidDobRes.json();
    assert.equal(invalidDobBody.data.findings.find((f) => f.type === 'beers'), undefined);

    // 3. Patient with future DOB string -> age is null, Beers MUST NOT trigger
    const futureDobRes = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        patientId: FUTURE_DOB_PATIENT_ID,
        confirmedMedicines: [{ brandId: 70, dosesPerDay: 1 }],
      }),
    });
    assert.equal(futureDobRes.status, 200);
    const futureDobBody = await futureDobRes.json();
    assert.equal(futureDobBody.data.findings.find((f) => f.type === 'beers'), undefined);

    // 4. Patient with confirmed senior DOB (1950, age ~76) -> Beers MUST trigger
    const seniorRes = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        patientId: SENIOR_PATIENT_ID,
        confirmedMedicines: [{ brandId: 70, dosesPerDay: 1 }],
      }),
    });
    assert.equal(seniorRes.status, 200);
    const seniorBody = await seniorRes.json();
    const seniorBeers = seniorBody.data.findings.find((f) => f.type === 'beers');
    assert.ok(seniorBeers, 'Beers criteria MUST trigger for verified senior patient (age >= 65)');
    assert.equal(seniorBeers.severity, 'major');
  });

  test('POST /api/check: evaluates Warfarin + Aspirin and returns major finding with caregiver action', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [
          { brandId: 10, dosesPerDay: 1 }, // Coumadin 5mg (warfarin)
          { brandId: 20, dosesPerDay: 1 }, // Disprin 325mg (aspirin)
        ],
        unrecognized: ['HerbalChurnaStripX'],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const report = body.data;
    assert.equal(report.summary.overallStatus, 'major');
    assert.equal(report.summary.majorCount, 1);
    assert.equal(report.summary.unrecognizedCount, 1);

    // Finding check
    const interactionFinding = report.findings.find((f) => f.type === 'interaction');
    assert.ok(interactionFinding);
    assert.equal(interactionFinding.severity, 'major');
    assert.equal(
      interactionFinding.action,
      "Contact the patient's doctor or pharmacist today before giving these medicines together. Do not alter prescribed doses without professional guidance."
    );

    // Unrecognized check
    assert.equal(report.unrecognized.length, 1);
    assert.equal(report.unrecognized[0].input, 'HerbalChurnaStripX');

    // Mandatory disclaimer check
    assert.ok(report.disclaimer.includes('informational screening tool'));
  });

  test('POST /api/check: returns "No known interaction found in our data" when pair is not in database', async () => {
    const res = await fetch(`${baseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        confirmedMedicines: [
          { brandId: 30, dosesPerDay: 1 }, // Calpol 500mg (paracetamol)
          { brandId: 40, dosesPerDay: 2 }, // Amoxil 500mg (amoxicillin)
        ],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const report = body.data;
    assert.equal(report.summary.overallStatus, 'clear');
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0].summary, 'No known interaction found in our data.');
    assert.equal(
      report.findings[0].action,
      'No known interaction found in our data. Always verify all medicines with a doctor or pharmacist.'
    );

    // CRITICAL SAFETY RULE: Never say "safe"
    const jsonStr = JSON.stringify(body).toLowerCase();
    assert.ok(!jsonStr.includes('is safe') && !jsonStr.includes('safe pain relief'));
  });
});
