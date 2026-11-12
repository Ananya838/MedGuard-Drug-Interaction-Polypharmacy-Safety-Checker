import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { importDdinterFiles, parseCsvLine } from '../import-ddinter.js';
import { importIndianBrands, parseComposition } from '../import-indian-brands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('CSV Parser: Correctly splits comma-separated lines and trims quotes', () => {
  const line = 'BrandA,"Composition (500mg) + SaltB",Manufacturer,tablet';
  const parsed = parseCsvLine(line);
  assert.deepEqual(parsed, ['BrandA', 'Composition (500mg) + SaltB', 'Manufacturer', 'tablet']);
});

test('Composition Parser: Parses multi-ingredient strings with dosages', () => {
  const comp = 'Pantoprazole (40mg) + Domperidone (30mg)';
  const parsed = parseComposition(comp);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'pantoprazole');
  assert.equal(parsed[0].strengthMg, 40);
  assert.equal(parsed[1].name, 'domperidone');
  assert.equal(parsed[1].strengthMg, 30);
});

test('DDInter Importer: Throws error when required header columns are missing', async () => {
  const invalidFile = path.join(__dirname, 'fixtures/ddinter_missing_columns.csv');
  const mockClient = {
    query: async () => ({ rows: [] })
  };

  await assert.rejects(
    async () => {
      await importDdinterFiles([invalidFile], { client: mockClient });
    },
    (err) => {
      assert.match(err.message, /Missing required column\(s\): Drug_B, Level/);
      assert.match(err.message, /Expected headers must contain: Drug_A, Drug_B, Level/);
      return true;
    }
  );
});

test('Indian Brands Importer: Throws error when required header columns are missing', async () => {
  const invalidFile = path.join(__dirname, 'fixtures/brands_missing_columns.csv');
  const mockClient = {
    query: async () => ({ rows: [] })
  };

  await assert.rejects(
    async () => {
      await importIndianBrands([invalidFile], { client: mockClient });
    },
    (err) => {
      assert.match(err.message, /Missing required column\(s\): composition/);
      assert.match(err.message, /Expected headers must contain: brand_name, composition/);
      return true;
    }
  );
});

test('DDInter Importer: Reports matched, merged, skipped counts and resolves synonyms', async () => {
  const sampleFile = path.join(__dirname, 'fixtures/ddinter_sample.csv');
  
  // Track inserted pairs in simulated DB state
  const insertedPairs = new Set();
  const mockClient = {
    query: async (sql, params) => {
      if (sql.includes('FROM ingredients')) {
        return {
          rows: [
            { id: 1, name: 'paracetamol' },
            { id: 4, name: 'aspirin' },
            { id: 5, name: 'warfarin' }
          ]
        };
      }
      if (sql.includes('FROM ingredient_synonyms')) {
        return {
          rows: [
            { ingredient_id: 1, synonym: 'acetaminophen' }
          ]
        };
      }
      if (sql.includes('INSERT INTO interactions')) {
        const pairKey = `${params[0]}-${params[1]}`;
        const isInserted = !insertedPairs.has(pairKey);
        insertedPairs.add(pairKey);
        return { rows: [{ is_inserted: isInserted }] };
      }
      return { rows: [] };
    }
  };

  const result = await importDdinterFiles([sampleFile], { client: mockClient });

  // ddinter_sample.csv has 4 rows:
  // 1. warfarin + aspirin -> matched (new pair 4-5)
  // 2. acetaminophen + warfarin -> matched (synonym acetaminophen maps to paracetamol, pair 1-5)
  // 3. unknown_substance_a + unknown_substance_b -> skipped (not in ingredients)
  // 4. warfarin + aspirin duplicate -> merged (pair 4-5 already exists)
  assert.equal(result.totalMatched, 2, 'Should match exactly 2 valid ingredient pairs');
  assert.equal(result.totalMerged, 1, 'Should merge 1 duplicate pair');
  assert.equal(result.totalSkipped, 1, 'Should skip 1 unknown pair');
});

test('Indian Brands Importer: Reports matched, merged, skipped counts and resolves synonyms', async () => {
  const sampleFile = path.join(__dirname, 'fixtures/brands_sample.csv');

  const insertedBrands = new Set();
  let brandIdCounter = 1;

  const mockClient = {
    query: async (sql, params) => {
      if (sql.includes('FROM ingredients')) {
        return { rows: [{ id: 1, name: 'paracetamol' }] };
      }
      if (sql.includes('FROM ingredient_synonyms')) {
        return { rows: [{ ingredient_id: 1, synonym: 'acetaminophen' }] };
      }
      if (sql.includes('INSERT INTO brands')) {
        const brandName = params[0];
        const isInserted = !insertedBrands.has(brandName);
        insertedBrands.add(brandName);
        return { rows: [{ id: brandIdCounter++, is_inserted: isInserted }] };
      }
      if (sql.includes('INSERT INTO brand_ingredients')) {
        return { rows: [] };
      }
      return { rows: [] };
    }
  };

  const result = await importIndianBrands([sampleFile], { client: mockClient });

  // brands_sample.csv has 4 rows:
  // 1. SampleParacetamol (Paracetamol 500mg) -> matched
  // 2. SampleAcetaminophen (Acetaminophen 650mg -> synonym maps to paracetamol) -> matched
  // 3. SampleUnknown (NonExistentChemical) -> skipped
  // 4. SampleParacetamol (update) -> merged
  assert.equal(result.totalMatched, 2, 'Should match exactly 2 valid brands');
  assert.equal(result.totalMerged, 1, 'Should merge 1 existing brand');
  assert.equal(result.totalSkipped, 1, 'Should skip 1 unresolvable brand');
});

