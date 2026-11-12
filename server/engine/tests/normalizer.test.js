import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../normalizer.js';

test('Normalizer Test: Synonym resolution maps acetaminophen to paracetamol', () => {
  const catalog = {
    brandsById: new Map([
      [101, {
        id: 101,
        brandName: 'Tylenol',
        ingredients: [{ id: 999, name: 'acetaminophen', strengthMg: 500 }]
      }]
    ]),
    synonyms: new Map([
      ['acetaminophen', 1]
    ]),
    ingredientsById: new Map([
      [1, { id: 1, name: 'paracetamol' }]
    ])
  };

  const { resolved, unrecognized } = normalize([{ brandId: 101 }], catalog);

  assert.equal(resolved.length, 1);
  assert.equal(unrecognized.length, 0);
  assert.equal(resolved[0].ingredients.length, 1);
  assert.equal(resolved[0].ingredients[0].id, 1, 'Synonym must resolve to canonical ID 1');
  assert.equal(resolved[0].ingredients[0].name, 'paracetamol', 'Synonym must resolve to canonical name paracetamol');
});

test('Normalizer Test: Combination product Pan-D expands to both active ingredients', () => {
  const catalog = {
    brandsById: new Map([
      [218, {
        id: 218,
        brandName: 'Pan-D',
        ingredients: [
          { id: 12, name: 'pantoprazole', strengthMg: 40 },
          { id: 15, name: 'domperidone', strengthMg: 30 }
        ]
      }]
    ])
  };

  const { resolved, unrecognized } = normalize([{ brandId: 218 }], catalog);

  assert.equal(resolved.length, 1);
  assert.equal(unrecognized.length, 0);
  assert.equal(resolved[0].ingredients.length, 2, 'Combination drug Pan-D must expand to 2 ingredients');
  assert.equal(resolved[0].ingredients[0].name, 'pantoprazole');
  assert.equal(resolved[0].ingredients[0].strengthMg, 40);
  assert.equal(resolved[0].ingredients[1].name, 'domperidone');
  assert.equal(resolved[0].ingredients[1].strengthMg, 30);
});

test('Normalizer Test: Unrecognized items are preserved and never dropped', () => {
  const catalog = {
    brandsById: new Map(),
    brandsByName: new Map()
  };

  const { resolved, unrecognized } = normalize(
    [{ customName: 'MysteryStrip99' }],
    catalog,
    ['HerbalChurnaUnconfirmed']
  );

  assert.equal(resolved.length, 0);
  assert.equal(unrecognized.length, 2, 'Both unrecognized items must be preserved');
  assert.match(unrecognized[0].input, /HerbalChurnaUnconfirmed/);
  assert.match(unrecognized[1].input, /MysteryStrip99/);
});

