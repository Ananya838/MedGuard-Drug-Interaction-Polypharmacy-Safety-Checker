import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAllergies } from '../allergyChecker.js';

test('Allergy Checker: Flags direct ingredient allergy match', () => {
  const patientAllergies = [{ type: 'ingredient', id: 11 }]; // allergic to amoxicillin (id 11)
  const normalizedMeds = [
    {
      brandName: 'Augmentin 625',
      ingredients: [
        { id: 11, name: 'amoxicillin', strengthMg: 500 },
        { id: 12, name: 'clavulanic acid', strengthMg: 125 }
      ]
    }
  ];

  const findings = checkAllergies(patientAllergies, normalizedMeds);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'allergy');
  assert.equal(findings[0].severity, 'major');
  assert.match(findings[0].summary, /amoxicillin/i);
});

test('Allergy Checker: Flags drug class allergy cross-sensitivity match', () => {
  const patientAllergies = [{ type: 'class', id: 99 }]; // class 99 = Penicillin Antibiotic
  const normalizedMeds = [
    {
      brandName: 'Mox 500',
      ingredients: [{ id: 11, name: 'amoxicillin', strengthMg: 500 }]
    }
  ];

  const classMap = new Map([
    [11, [{ id: 99, name: 'Penicillin Antibiotic' }]]
  ]);

  const findings = checkAllergies(patientAllergies, normalizedMeds, classMap);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'allergy');
  assert.equal(findings[0].severity, 'major');
  assert.match(findings[0].summary, /Penicillin Antibiotic/i);
});

