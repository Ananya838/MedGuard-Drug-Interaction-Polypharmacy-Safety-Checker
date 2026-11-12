import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFood } from '../foodChecker.js';

test('Food Checker: Flags dietary interaction with grapefruit', () => {
  const normalizedMeds = [
    {
      brandName: 'Atorva 20',
      ingredients: [{ id: 22, name: 'atorvastatin', strengthMg: 20 }]
    }
  ];

  const foodRules = [
    {
      ingredientId: 22,
      item: 'grapefruit',
      severity: 'moderate',
      description: 'Grapefruit juice elevates atorvastatin levels and risks muscle toxicity.'
    }
  ];

  const findings = checkFood(normalizedMeds, foodRules);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'food');
  assert.equal(findings[0].severity, 'moderate');
  assert.match(findings[0].summary, /grapefruit/i);
});

