import test from 'node:test';
import assert from 'node:assert/strict';
import { runAllChecks } from '../index.js';
import { ACTION_TEMPLATES, MANDATORY_DISCLAIMER } from '../constants.js';

test('Engine Full Pipeline Test: Evaluates polypharmacy case with PRD section 8 compliance', () => {
  const patient = {
    age: 72,
    allergies: [{ type: 'ingredient', id: 11 }], // Allergic to amoxicillin
    conditions: ['CKD'] // Chronic Kidney Disease
  };

  const confirmedMedicines = [
    { brandId: 104, dosesPerDay: 4 }, // Dolo 650 (paracetamol 650mg x 4 = 2600mg)
    { brandId: 101, dosesPerDay: 2 }, // Crocin 500 (paracetamol 500mg x 2 = 1000mg) -> Total 3600mg (exceeds senior 3000mg limit)
    { brandId: 501, isPrn: true },    // Brufen 400 (ibuprofen 400mg) -> Contraindicated in CKD, PRN
    { brandId: 601, dosesPerDay: 1 }, // Alprax 0.5 (alprazolam 0.5mg) -> Beers list at age 72
    { brandId: 701, dosesPerDay: 2 }  // Mox 500 (amoxicillin 500mg) -> Allergic
  ];

  const scopedRules = {
    brandCatalog: {
      brandsById: new Map([
        [104, { id: 104, brandName: 'Dolo 650', ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 650 }] }],
        [101, { id: 101, brandName: 'Crocin 500', ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 500 }] }],
        [501, { id: 501, brandName: 'Brufen 400', ingredients: [{ id: 2, name: 'ibuprofen', strengthMg: 400 }] }],
        [601, { id: 601, brandName: 'Alprax 0.5', ingredients: [{ id: 37, name: 'alprazolam', strengthMg: 0.5 }] }],
        [701, { id: 701, brandName: 'Mox 500', ingredients: [{ id: 11, name: 'amoxicillin', strengthMg: 500 }] }]
      ]),
      synonyms: new Map(),
      ingredientsById: new Map([
        [1, { id: 1, name: 'paracetamol' }],
        [2, { id: 2, name: 'ibuprofen' }],
        [11, { id: 11, name: 'amoxicillin' }],
        [37, { id: 37, name: 'alprazolam' }]
      ])
    },
    ingredientClassesMap: new Map(),
    scopedInteractions: new Map(),
    scopedTimingRules: new Map(),
    scopedContraindications: [
      { ingredientId: 2, conditionCode: 'CKD', severity: 'major', description: 'NSAIDs cause acute renal decline in CKD patients.' }
    ],
    scopedBeersRules: [
      { ingredientId: 37, rationale: 'Benzodiazepines risk cognitive decline and falls in older adults.', severity: 'major' }
    ],
    scopedFoodRules: [],
    scopedDoseLimits: [
      { ingredientId: 1, ageMin: 65, ageMax: 150, maxDailyDoseMg: 3000 }
    ]
  };

  const initialUnrecognized = ['AyurvedicHerbalExtract'];

  const report = runAllChecks(patient, confirmedMedicines, scopedRules, initialUnrecognized);

  // 1. Verify Structure (PRD Section 8)
  assert.ok(report.summary, 'Must contain summary');
  assert.ok(Array.isArray(report.findings), 'Must contain findings array');
  assert.ok(Array.isArray(report.unrecognized), 'Must contain unrecognized array');
  assert.equal(report.disclaimer, MANDATORY_DISCLAIMER);

  // 2. Verify Findings Count & Types
  assert.equal(report.summary.overallStatus, 'major');
  assert.ok(report.summary.majorCount >= 3, 'Should have multiple major findings');
  assert.equal(report.unrecognized.length, 1);
  assert.equal(report.unrecognized[0].input, 'AyurvedicHerbalExtract');

  // Verify finding types present
  const types = report.findings.map((f) => f.type);
  assert.ok(types.includes('duplicate'), 'Should detect duplicate paracetamol');
  assert.ok(types.includes('allergy'), 'Should detect amoxicillin allergy');
  assert.ok(types.includes('contraindication'), 'Should detect ibuprofen in CKD');
  assert.ok(types.includes('beers'), 'Should detect alprazolam in 72yo');
  assert.ok(types.includes('dose'), 'Should detect paracetamol exceeding 3000mg limit & PRN notice');

  // 3. Verify Action Text Template Consistency
  for (const finding of report.findings) {
    assert.equal(
      finding.action,
      ACTION_TEMPLATES[finding.severity],
      `Finding of severity ${finding.severity} must strictly match standard template`
    );
  }
});

