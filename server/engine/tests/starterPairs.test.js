import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkInteractions } from '../interactionChecker.js';
import { ACTION_TEMPLATES } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Starter Pairs Test: All 33 unverified starter pairs are flagged with valid templates', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'starter-pairs.json'), 'utf8'));
  assert.equal(data.pairs.length, 33, 'Must contain all 33 unverified starter pairs');

  let idCounter = 1;
  const nameToId = new Map();
  function getId(name) {
    const key = name.toLowerCase().trim();
    if (!nameToId.has(key)) {
      nameToId.set(key, idCounter++);
    }
    return nameToId.get(key);
  }

  // Build scoped interaction rules map
  const scopedRules = new Map();
  for (const pair of data.pairs) {
    const idA = getId(pair.ingredientA);
    const idB = getId(pair.ingredientB);
    const [canonA, canonB] = idA < idB ? [idA, idB] : [idB, idA];
    scopedRules.set(`${canonA}-${canonB}`, {
      ingredientA: canonA,
      ingredientB: canonB,
      severity: pair.severity,
      summary: `Interaction between ${pair.ingredientA} and ${pair.ingredientB}`,
      explanation: pair.mechanism,
      source: data.source
    });
  }

  // Test each pair individually
  for (const pair of data.pairs) {
    const idA = getId(pair.ingredientA);
    const idB = getId(pair.ingredientB);

    const testMedicines = [
      {
        brandName: `Brand_${pair.ingredientA}`,
        ingredients: [{ id: idA, name: pair.ingredientA, strengthMg: 100 }]
      },
      {
        brandName: `Brand_${pair.ingredientB}`,
        ingredients: [{ id: idB, name: pair.ingredientB, strengthMg: 50 }]
      }
    ];

    const findings = checkInteractions(testMedicines, scopedRules);
    assert.equal(
      findings.length,
      1,
      `Pair ${pair.ingredientA} + ${pair.ingredientB} should produce exactly 1 finding`
    );

    const finding = findings[0];
    assert.equal(finding.severity, pair.severity);
    assert.equal(finding.action, ACTION_TEMPLATES[pair.severity]);

    // Safety check on action text: Must NEVER tell anyone to stop, change, switch, halve, or cap
    const forbiddenPhrases = [
      /\bstop\b/i,
      /\bchange\b/i,
      /\bswitch\b/i,
      /\bhalve\b/i,
      /\bcap\b/i,
      /\bskip\b/i
    ];
    for (const phrase of forbiddenPhrases) {
      assert.equal(
        phrase.test(finding.action),
        false,
        `Action text must not contain prescribing directive: ${phrase}`
      );
    }

    // Must advise contacting doctor or pharmacist
    assert.match(finding.action, /doctor or pharmacist/i);
  }
});

