import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDuplicates } from '../duplicateChecker.js';
import { SEVERITY_LEVELS } from '../constants.js';

test('Duplicate Checker: Flags duplicate active ingredient (Dolo 650 + Crocin 500)', () => {
  const normalizedMeds = [
    {
      brandName: 'Dolo 650',
      ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 650 }]
    },
    {
      brandName: 'Crocin 500',
      ingredients: [{ id: 1, name: 'paracetamol', strengthMg: 500 }]
    }
  ];

  const findings = checkDuplicates(normalizedMeds);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'duplicate');
  assert.equal(findings[0].severity, SEVERITY_LEVELS.MAJOR);
  assert.match(findings[0].summary, /paracetamol/i);
});

test('Duplicate Checker: Flags pharmacological class duplicate (Brufen 400 + Voveran 50 in NSAID)', () => {
  const normalizedMeds = [
    {
      brandName: 'Brufen 400',
      ingredients: [{ id: 2, name: 'ibuprofen', strengthMg: 400 }]
    },
    {
      brandName: 'Voveran 50',
      ingredients: [{ id: 3, name: 'diclofenac', strengthMg: 50 }]
    }
  ];

  const classMap = new Map([
    [2, ['NSAID']],
    [3, ['NSAID']]
  ]);

  const findings = checkDuplicates(normalizedMeds, classMap);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'duplicate');
  assert.equal(findings[0].severity, SEVERITY_LEVELS.MODERATE);
  assert.match(findings[0].summary, /NSAID/i);
});

