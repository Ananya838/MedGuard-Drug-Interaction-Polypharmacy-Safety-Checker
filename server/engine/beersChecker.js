import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 7: Beers Criteria Geriatric Risk Checker
 * Evaluates medications on the American Geriatrics Society (AGS) Beers Criteria
 * list for patients aged 65 and older. Pure functional module.
 *
 * @param {number} patientAge - Age of patient in years
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Array<Object>} [scopedBeersRules=[]] - Beers criteria rules
 * @returns {Array<Object>} List of Beers criteria findings
 */
export function checkBeers(patientAge, normalizedMedicines = [], scopedBeersRules = []) {
  const findings = [];

  // Beers criteria applies strictly to patients aged 65 and older
  if (typeof patientAge !== 'number' || patientAge < 65) {
    return findings;
  }

  const beersMap = new Map();
  for (const rule of scopedBeersRules) {
    const id = rule.ingredientId || rule.ingredient_id;
    if (id) {
      beersMap.set(id, rule);
    }
  }

  for (const med of normalizedMedicines) {
    for (const ing of med.ingredients) {
      if (!ing.id || !beersMap.has(ing.id)) continue;

      const rule = beersMap.get(ing.id);
      const severity = (rule.severity || SEVERITY_LEVELS.MAJOR).toLowerCase();

      findings.push({
        type: FINDING_TYPES.BEERS,
        severity,
        items: [med.brandName, ing.name],
        summary: `Beers Criteria alert: ${med.brandName} is potentially inappropriate for adults aged 65+.`,
        explanation: rule.rationale || `${ing.name} has elevated risks of cognitive decline, falls, or adverse events in older adults.`,
        action: ACTION_TEMPLATES[severity] || ACTION_TEMPLATES.major,
        source: rule.source || 'AGS Beers Criteria 2023'
      });
    }
  }

  return findings;
}

