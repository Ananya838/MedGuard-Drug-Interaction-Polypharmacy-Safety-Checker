import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBeers } from '../beersChecker.js';

test('Beers Criteria Checker: Flags high-risk geriatric medication for patient aged 74', () => {
  const patientAge = 74;
  const normalizedMeds = [
    {
      brandName: 'Alprax 0.5',
      ingredients: [{ id: 37, name: 'alprazolam', strengthMg: 0.5 }]
    }
  ];

  const beersRules = [
    {
      ingredientId: 37,
      rationale: 'Benzodiazepines increase risk of cognitive impairment and falls in older adults.',
      severity: 'major'
    }
  ];

  const findings = checkBeers(patientAge, normalizedMeds, beersRules);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'beers');
  assert.equal(findings[0].severity, 'major');
  assert.match(findings[0].summary, /65\+/);
});

test('Beers Criteria Checker: Does NOT trigger for patients younger than 65', () => {
  const patientAge = 45;
  const normalizedMeds = [
    {
      brandName: 'Alprax 0.5',
      ingredients: [{ id: 37, name: 'alprazolam', strengthMg: 0.5 }]
    }
  ];

  const beersRules = [
    {
      ingredientId: 37,
      rationale: 'Benzodiazepines increase risk of cognitive impairment in older adults.',
      severity: 'major'
    }
  ];

  const findings = checkBeers(patientAge, normalizedMeds, beersRules);
  assert.equal(findings.length, 0, 'Beers criteria must not apply to age under 65');
});

