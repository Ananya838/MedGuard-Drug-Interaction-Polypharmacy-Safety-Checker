import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTiming } from '../timingChecker.js';

test('Timing Checker: Flags administration spacing rule', () => {
  const normalizedMeds = [
    {
      brandName: 'Cifran 500',
      ingredients: [{ id: 43, name: 'ciprofloxacin', strengthMg: 500 }]
    },
    {
      brandName: 'Potklor',
      ingredients: [{ id: 21, name: 'potassium chloride', strengthMg: 1000 }]
    }
  ];

  const timingRules = [
    {
      ingredientA: 21,
      ingredientB: 43,
      minGapHours: 2.0,
      severity: 'moderate',
      advice: 'Separate taking Ciprofloxacin and multivalent electrolytes by at least 2 hours.'
    }
  ];

  const findings = checkTiming(normalizedMeds, timingRules);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'timing');
  assert.equal(findings[0].severity, 'moderate');
  assert.match(findings[0].summary, /2-hour interval/i);
});

