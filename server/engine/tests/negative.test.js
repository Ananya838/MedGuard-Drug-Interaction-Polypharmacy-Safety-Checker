import test from 'node:test';
import assert from 'node:assert/strict';
import { runAllChecks } from '../index.js';
import { NO_INTERACTION_MESSAGE } from '../constants.js';

test('Negative Interaction Test: Returns "No known interaction found in our data" when pair is absent from fixed dataset', () => {
  // Fixed test dataset: contains ONLY one interaction rule between Ingredient 1 and Ingredient 2
  const fixedTestRules = {
    brandCatalog: {
      brandsById: new Map([
        [10, { id: 10, brandName: 'BrandAlpha', ingredients: [{ id: 100, name: 'compound_alpha', strengthMg: 50 }] }],
        [20, { id: 20, brandName: 'BrandBeta', ingredients: [{ id: 200, name: 'compound_beta', strengthMg: 100 }] }]
      ]),
      synonyms: new Map(),
      ingredientsById: new Map([
        [100, { id: 100, name: 'compound_alpha' }],
        [200, { id: 200, name: 'compound_beta' }]
      ])
    },
    // The tested pair (100, 200) is deliberately absent from this fixed test fixture
    scopedInteractions: new Map([
      ['1-2', { ingredientA: 1, ingredientB: 2, severity: 'major', summary: 'Mock conflict' }]
    ])
  };

  const confirmedMedicines = [
    { brandId: 10, dosesPerDay: 1 },
    { brandId: 20, dosesPerDay: 1 }
  ];

  const report = runAllChecks({ age: 45 }, confirmedMedicines, fixedTestRules);

  assert.equal(report.summary.overallStatus, 'clear');
  assert.equal(report.summary.majorCount, 0);
  assert.equal(report.summary.moderateCount, 0);

  // Must return the required exact text
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].summary, NO_INTERACTION_MESSAGE);
  assert.equal(report.findings[0].severity, 'info');

  // NON-NEGOTIABLE SAFETY RULE: The report must NEVER use the word "safe"
  const fullReportText = JSON.stringify(report).toLowerCase();
  assert.equal(
    fullReportText.includes('"safe"'),
    false,
    'Safety report must NEVER use the word "safe"'
  );
});

