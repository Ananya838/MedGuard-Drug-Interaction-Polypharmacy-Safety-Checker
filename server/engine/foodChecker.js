import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 8: Food and Alcohol Conflict Checker
 * Detects interactions between confirmed medicines and common dietary items / alcohol.
 * Pure functional module.
 *
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Array<Object>} [scopedFoodRules=[]] - Food interaction rules
 * @returns {Array<Object>} List of food/alcohol interaction findings
 */
export function checkFood(normalizedMedicines = [], scopedFoodRules = []) {
  const findings = [];

  const foodMap = new Map();
  for (const rule of scopedFoodRules) {
    const id = rule.ingredientId || rule.ingredient_id;
    if (id) {
      if (!foodMap.has(id)) {
        foodMap.set(id, []);
      }
      foodMap.get(id).push(rule);
    }
  }

  for (const med of normalizedMedicines) {
    for (const ing of med.ingredients) {
      if (!ing.id || !foodMap.has(ing.id)) continue;

      for (const rule of foodMap.get(ing.id)) {
        const severity = (rule.severity || SEVERITY_LEVELS.MODERATE).toLowerCase();
        const item = rule.item ? rule.item.toUpperCase() : 'DIETARY ITEM';

        findings.push({
          type: FINDING_TYPES.FOOD,
          severity,
          items: [med.brandName, item],
          summary: `Dietary precaution: ${med.brandName} conflicts with ${rule.item}.`,
          explanation: rule.description || `Consuming ${rule.item} while taking ${ing.name} can alter drug absorption or increase side effects.`,
          action: ACTION_TEMPLATES[severity] || ACTION_TEMPLATES.moderate,
          source: rule.source || 'Clinical Pharmacology Guidelines'
        });
      }
    }
  }

  return findings;
}

