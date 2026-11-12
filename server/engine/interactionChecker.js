import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 3: Pairwise Drug-Drug Interaction Checker
 * Evaluates all unique pairs of active ingredients using canonical integer IDs (A < B).
 * Severity comes from the data. Action text comes from fixed templates in constants.js.
 * Pure functional module.
 *
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Map<string, Object>|Array<Object>} scopedInteractions - Pre-loaded interaction rules
 * @returns {Array<Object>} List of pairwise interaction findings
 */
export function checkInteractions(normalizedMedicines = [], scopedInteractions = new Map()) {
  const findings = [];

  // Convert array to lookup Map if needed
  let interactionMap = scopedInteractions;
  if (Array.isArray(scopedInteractions)) {
    interactionMap = new Map();
    for (const rule of scopedInteractions) {
      const [a, b] = rule.ingredientA < rule.ingredientB 
        ? [rule.ingredientA, rule.ingredientB] 
        : [rule.ingredientB, rule.ingredientA];
      interactionMap.set(`${a}-${b}`, rule);
    }
  }

  // Map each active ingredient to the brand(s) supplying it
  const ingredientToBrands = new Map(); // ingredientId -> Set of brandNames
  const ingredientNames = new Map(); // ingredientId -> name

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

  // Evaluate all unique pairs A < B
  for (let i = 0; i < uniqueIngredientIds.length; i++) {
    for (let j = i + 1; j < uniqueIngredientIds.length; j++) {
      const idA = uniqueIngredientIds[i];
      const idB = uniqueIngredientIds[j];
      const key = `${idA}-${idB}`;

      if (interactionMap.has(key)) {
        const rule = interactionMap.get(key);
        const nameA = ingredientNames.get(idA) || `Ingredient #${idA}`;
        const nameB = ingredientNames.get(idB) || `Ingredient #${idB}`;
        const brandsA = [...ingredientToBrands.get(idA)].join('/');
        const brandsB = [...ingredientToBrands.get(idB)].join('/');

        const severity = (rule.severity || SEVERITY_LEVELS.MODERATE).toLowerCase();
        const action = ACTION_TEMPLATES[severity] || ACTION_TEMPLATES.moderate;

        findings.push({
          type: FINDING_TYPES.INTERACTION,
          severity,
          items: [brandsA, brandsB],
          summary: rule.summary || `Interaction detected between ${nameA} and ${nameB}.`,
          explanation: rule.explanation || `Taking ${nameA} and ${nameB} together has a documented clinical interaction.`,
          action,
          source: rule.source || 'DDInter v2.0'
        });
      }
    }
  }

  return findings;
}

