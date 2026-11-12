import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../app.js';
import { setPool } from '../config.js';
import { signAccessToken } from '../auth/jwt.js';

describe('Medicine Search & Normalization Endpoints', () => {
  let server;
  let baseUrl;
  let validToken;

  const mockBrands = [
    { id: 104, brand_name: 'Dolo 650', manufacturer: 'Micro Labs', form: 'tablet', strength_raw: '650mg' },
    { id: 101, brand_name: 'Crocin 500', manufacturer: 'GSK', form: 'tablet', strength_raw: '500mg' },
    { id: 218, brand_name: 'Pan-D', manufacturer: 'Alkem', form: 'capsule', strength_raw: '40mg/30mg' },
  ];

  const mockBrandIngredients = [
    { brand_id: 104, id: 1, name: 'paracetamol', strengthMg: 650 },
    { brand_id: 101, id: 1, name: 'paracetamol', strengthMg: 500 },
    { brand_id: 218, id: 12, name: 'pantoprazole', strengthMg: 40 },
    { brand_id: 218, id: 15, name: 'domperidone', strengthMg: 30 },
  ];

  const mockDbPool = {
    async query(sql, params = []) {
      const lowerSql = sql.toLowerCase().trim();

      // Search brands: SELECT id, brand_name AS name, manufacturer, strength_raw AS strength, form FROM brands WHERE brand_name ILIKE $1
      if (lowerSql.includes('from brands') && lowerSql.includes('ilike $1')) {
        const queryTerm = params[0].replace(/%/g, '').toLowerCase();
        const matches = mockBrands
          .filter((b) => b.brand_name.toLowerCase().includes(queryTerm))
          .map((b) => ({
            id: b.id,
            name: b.brand_name,
            manufacturer: b.manufacturer,
            strength: b.strength_raw,
            form: b.form,
          }));
        return { rows: matches };
      }

      // Exact or ILIKE match in normalization
      if (lowerSql.includes('from brands b') && (lowerSql.includes('lower(b.brand_name) = lower($1)') || lowerSql.includes('ilike $2'))) {
        const exact = params[0].toLowerCase();
        const found = mockBrands.filter(
          (b) => b.brand_name.toLowerCase() === exact || b.brand_name.toLowerCase().includes(exact)
        );
        return { rows: found.slice(0, 1) };
      }

      // Generic ingredient match in normalization
      if (lowerSql.includes('from ingredients i') && lowerSql.includes('join brands b')) {
        const exact = params[0].toLowerCase();
        const ing = mockBrandIngredients.find((bi) => bi.name.toLowerCase() === exact);
        if (ing) {
          const brand = mockBrands.find((b) => b.id === ing.brand_id);
          if (brand) {
            return { rows: [brand] };
          }
        }
        return { rows: [] };
      }

      // Brand ingredients
      if (lowerSql.includes('from brand_ingredients bi') && lowerSql.includes('where bi.brand_id = $1')) {
        const brandId = params[0];
        const items = mockBrandIngredients.filter((bi) => bi.brand_id === brandId);
        return { rows: items };
      }

      return { rows: [] };
    },
  };

  before(async () => {
    setPool(mockDbPool);
    validToken = signAccessToken({ id: 'caregiver-1', email: 'test@example.com', name: 'Tester', language: 'en' });

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

  test('GET /api/medicines/search: requires authentication', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/search?q=dolo`);
    assert.equal(res.status, 401);
  });

  test('GET /api/medicines/search: rejects query shorter than 2 chars', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/search?q=d`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('GET /api/medicines/search: returns matching brand suggestions', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/search?q=dolo`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].name, 'Dolo 650');
  });

  test('POST /api/medicines/normalize: resolves combination products and preserves unrecognized items', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/normalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        queries: ['Pan-D', 'UnknownStripX999'],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.resolved);
    assert.ok(body.data.unresolved);

    // Combination product Pan-D resolved into 2 active ingredients
    assert.equal(body.data.resolved.length, 1);
    const panD = body.data.resolved[0];
    assert.equal(panD.brandName, 'Pan-D');
    assert.equal(panD.ingredients.length, 2);
    assert.equal(panD.ingredients[0].name, 'pantoprazole');
    assert.equal(panD.ingredients[1].name, 'domperidone');

    // Unknown item preserved in unresolved
    assert.equal(body.data.unresolved.length, 1);
    assert.equal(body.data.unresolved[0].query, 'UnknownStripX999');
    assert.equal(body.data.unresolved[0].reason, 'Not found in local brand catalog');
  });

  test('POST /api/medicines/normalize: resolves generic active ingredient to matching formulation', async () => {
    const res = await fetch(`${baseUrl}/api/medicines/normalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        queries: ['pantoprazole'],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.resolved.length, 1);
    assert.equal(body.data.resolved[0].brandName, 'Pan-D');
    assert.equal(body.data.unresolved.length, 0);
  });
});

