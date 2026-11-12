import test from 'node:test';
import assert from 'node:assert/strict';
import { checkContraindications } from '../contraindicationChecker.js';

test('Contraindication Checker: Flags medicine contraindicated with controlled condition code', () => {
  const patientConditions = ['CKD', 'HYPERTENSION'];
  const normalizedMeds = [
    {
      brandName: 'Brufen 400',
      ingredients: [{ id: 2, name: 'ibuprofen', strengthMg: 400 }]
    }
  ];

  const contraindications = [
    {
      ingredientId: 2,
      conditionCode: 'CKD',
      severity: 'major',
      description: 'NSAIDs cause acute renal decline in CKD patients.'
    }
  ];

  const findings = checkContraindications(patientConditions, normalizedMeds, contraindications);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'contraindication');
  assert.equal(findings[0].severity, 'major');
  assert.match(findings[0].summary, /CKD/);
});

test('Contraindication Checker: Does not flag when condition code does not match', () => {
  const patientConditions = ['DIABETES_T2'];
  const normalizedMeds = [
    {
      brandName: 'Brufen 400',
      ingredients: [{ id: 2, name: 'ibuprofen', strengthMg: 400 }]
    }
  ];

  const contraindications = [
    {
      ingredientId: 2,
      conditionCode: 'CKD',
      severity: 'major',
      description: 'NSAIDs cause acute renal decline in CKD patients.'
    }
  ];

  const findings = checkContraindications(patientConditions, normalizedMeds, contraindications);
  assert.equal(findings.length, 0);
});

