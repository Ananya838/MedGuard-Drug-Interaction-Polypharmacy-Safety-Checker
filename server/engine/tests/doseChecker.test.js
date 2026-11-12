import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMaxDose } from '../doseChecker.js';

test('Dose Checker: Reports "cannot calculate daily total" for as-needed (PRN) medicines', () => {
  const normalizedMeds = [
    {
      brandName: 'Disprin 325',
      doseAmount: 1,
      dosesPerDay: 1,
      isPrn: true,
      ingredients: [{ id: 4, name: 'aspirin', strengthMg: 325 }]
    }
  ];

  const findings = checkMaxDose(60, normalizedMeds, []);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'dose');
  assert.equal(findings[0].severity, 'info');
  assert.match(findings[0].summary, /Cannot calculate daily total for as-needed \(PRN\) medicine/i);
});

test('Dose Checker: Flags exceeded daily dose limit for scheduled medicine', () => {
  const normalizedMeds = [
    {
      brandName: 'Dolo 650',
      doseAmount: 1,
      dosesPerDay: 4, // 2600 mg
      isPrn: false,
      ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 650 }]
    },
    {
      brandName: 'Crocin 500',
      doseAmount: 1,
      dosesPerDay: 4, // 2000 mg -> Total 4600 mg
      isPrn: false,
      ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 500 }]
    }
  ];

  const doseLimits = [
    { ingredientId: 1, ageMin: 0, ageMax: 150, maxDailyDoseMg: 4000 }
  ];

  const findings = checkMaxDose(45, normalizedMeds, doseLimits);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'dose');
  assert.equal(findings[0].severity, 'major');
  assert.match(findings[0].summary, /4600mg\/day exceeds the 4000mg\/day limit/);
});

test('Dose Checker: Applies age-adjusted dose limit (3000mg for age >= 65)', () => {
  const normalizedMeds = [
    {
      brandName: 'Dolo 650',
      doseAmount: 1,
      dosesPerDay: 5, // 3250 mg
      isPrn: false,
      ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 650 }]
    }
  ];

  const ageAdjustedLimits = [
    { ingredientId: 1, ageMin: 0, ageMax: 64, maxDailyDoseMg: 4000 },
    { ingredientId: 1, ageMin: 65, ageMax: 150, maxDailyDoseMg: 3000 }
  ];

  // For adult age 40: 3250mg is UNDER 4000mg limit -> no finding
  const adultFindings = checkMaxDose(40, normalizedMeds, ageAdjustedLimits);
  assert.equal(adultFindings.length, 0);

  // For senior age 72: 3250mg EXCEEDS 3000mg limit -> major finding
  const seniorFindings = checkMaxDose(72, normalizedMeds, ageAdjustedLimits);
  assert.equal(seniorFindings.length, 1);
  assert.equal(seniorFindings[0].severity, 'major');
  assert.match(seniorFindings[0].summary, /3250mg\/day exceeds the 3000mg\/day limit/);
});

