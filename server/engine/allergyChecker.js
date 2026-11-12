import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 5: Allergy Cross-Checker
 * Evaluates controlled patient allergies (ingredient IDs or drug class IDs)
 * against confirmed medicines and their ingredients/classes.
 * Pure functional module.
 *
 * @param {Array<Object>} patientAllergies - e.g. [{ type: 'ingredient', id: 11 }, { type: 'class', id: 4 }]
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Map<number, Array<Object>>} [ingredientClassesMap] - Map of ingredientId to array of { id, name }
 * @returns {Array<Object>} List of allergy conflict findings
 */
export function checkAllergies(patientAllergies = [], normalizedMedicines = [], ingredientClassesMap = new Map()) {
  const findings = [];
  if (!Array.isArray(patientAllergies) || patientAllergies.length === 0) {
    return findings;
  }

  const allergicIngredientIds = new Set(
    patientAllergies
      .filter((a) => a && (a.type === 'ingredient' || !a.type) && a.id)
      .map((a) => Number(a.id))
  );

  const allergicIngredientNames = new Set(
    patientAllergies
      .filter((a) => a && (a.name || a.label))
      .map((a) => (a.name || a.label).toLowerCase().trim())
  );

  const allergicClassIds = new Set(
    patientAllergies
      .filter((a) => a && (a.type === 'class' || a.type === 'drug_class') && a.id)
      .map((a) => Number(a.id))
  );

  const allergicClassNames = new Set(
    patientAllergies
      .filter((a) => a && (a.type === 'class' || a.type === 'drug_class' || !a.type) && (a.name || a.label))
      .map((a) => (a.name || a.label).toLowerCase().trim())
  );

  for (const med of normalizedMedicines) {
    for (const ing of med.ingredients) {
      if (!ing.id) continue;

      const ingNameLower = (ing.name || '').toLowerCase().trim();

      // 1. Direct ingredient allergy match
      if (allergicIngredientIds.has(ing.id) || allergicIngredientNames.has(ingNameLower)) {
        const severity = SEVERITY_LEVELS.MAJOR;
        findings.push({
          type: FINDING_TYPES.ALLERGY,
          severity,
          items: [med.brandName, ing.name],
          summary: `Allergy alert: ${med.brandName} contains ${ing.name}, which the patient is allergic to.`,
          explanation: `The patient profile records an allergy to this active ingredient. Administering this medicine risks triggering an allergic reaction.`,
          action: ACTION_TEMPLATES[severity],
          source: 'Patient Health Record & MedGuard Allergy Rules'
        });
      }

      // 2. Drug class cross-sensitivity match
      const classes = ingredientClassesMap.get(ing.id) || [];
      for (const cls of classes) {
        const classId = typeof cls === 'object' && cls !== null ? cls.id : null;
        const className = typeof cls === 'object' && cls !== null ? cls.name : String(cls);
        const classNameLower = className.toLowerCase().trim();

        const isClassMatch = (classId && allergicClassIds.has(classId)) ||
          allergicClassNames.has(classNameLower) ||
          (classNameLower.includes('nsaid') && [...allergicClassNames].some((n) => n.includes('nsaid')));

        if (isClassMatch) {
          const severity = SEVERITY_LEVELS.MAJOR;
          findings.push({
            type: FINDING_TYPES.ALLERGY,
            severity,
            items: [med.brandName, className],
            summary: `Allergy class alert: ${med.brandName} contains an ingredient in the ${className} class.`,
            explanation: `The patient profile records a class allergy to ${className}. ${ing.name} belongs to this class and carries cross-reactivity risk.`,
            action: ACTION_TEMPLATES[severity],
            source: 'Patient Health Record & MedGuard Drug Class Hierarchy'
          });
        }
      }
    }
  }

  return findings;
}

