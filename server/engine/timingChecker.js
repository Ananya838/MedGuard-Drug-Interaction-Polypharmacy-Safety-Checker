import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 4: Timing & Administration Spacing Checker
 * Evaluates whether medicines require interval spacing (e.g. 2 hours gap).
 * Pure functional module.
 *
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Map<string, Object>|Array<Object>} scopedTimingRules - Spacing rules (canonical A < B)
 * @returns {Array<Object>} List of timing conflict findings
 */
export function checkTiming(normalizedMedicines = [], scopedTimingRules = new Map()) {
  const findings = [];

  let timingMap = scopedTimingRules;
  if (Array.isArray(scopedTimingRules)) {
    timingMap = new Map();
    for (const rule of scopedTimingRules) {
      const [a, b] = rule.ingredientA < rule.ingredientB 
        ? [rule.ingredientA, rule.ingredientB] 
        : [rule.ingredientB, rule.ingredientA];
      timingMap.set(`${a}-${b}`, rule);
    }
  }

  const ingredientToBrands = new Map();
  const ingredientNames = new Map();

  for (const med of normalizedMedicines) {
    for (const ing of med.ingredients) {
      if (!ing.id) continue;
      if (!ingredientToBrands.has(ing.id)) {
        ingredientToBrands.set(ing.id, new Set());
      }
      ingredientToBrands.get(ing.id).add(med.brandName);
      ingredientNames.set(ing.id, ing.name);
    }
  }

  const uniqueIngredientIds = Array.from(ingredientToBrands.keys()).sort((a, b) => a - b);

  for (let i = 0; i < uniqueIngredientIds.length; i++) {
    for (let j = i + 1; j < uniqueIngredientIds.length; j++) {
      const idA = uniqueIngredientIds[i];
      const idB = uniqueIngredientIds[j];
      const key = `${idA}-${idB}`;

      if (timingMap.has(key)) {
        const rule = timingMap.get(key);
        const nameA = ingredientNames.get(idA) || `Ingredient #${idA}`;
        const nameB = ingredientNames.get(idB) || `Ingredient #${idB}`;
        const brandsA = [...ingredientToBrands.get(idA)].join('/');
        const brandsB = [...ingredientToBrands.get(idB)].join('/');

        const severity = (rule.severity || SEVERITY_LEVELS.MODERATE).toLowerCase();
        const action = ACTION_TEMPLATES[severity] || ACTION_TEMPLATES.moderate;

        findings.push({
          type: FINDING_TYPES.TIMING,
          severity,
          items: [brandsA, brandsB],
          summary: `Spacing requirement: ${nameA} and ${nameB} require at least a ${rule.minGapHours || 2}-hour interval.`,
          explanation: rule.advice || `Taking these medicines at the same time reduces absorption or triggers gastrointestinal interference.`,
          action,
          source: rule.source || 'MedGuard Administration Rules'
        });
      }
    }
  }

  return findings;
}

