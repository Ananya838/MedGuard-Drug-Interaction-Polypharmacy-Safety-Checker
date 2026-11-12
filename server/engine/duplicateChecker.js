import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 2: Duplicate Therapy Detector
 * Detects identical active ingredients and identical pharmacological drug classes
 * across different prescribed medicines. Pure functional module.
 *
 * @param {Array<Object>} normalizedMedicines - Resolved medicines from normalizer
 * @param {Map<number, Array<string>>} [ingredientClassesMap] - Map of ingredientId to array of class names
 * @returns {Array<Object>} List of duplicate findings
 */
export function checkDuplicates(normalizedMedicines = [], ingredientClassesMap = new Map()) {
  const findings = [];
  const ingredientOccurrences = new Map(); // ingredientId -> array of { brandName, strengthMg }
  const classOccurrences = new Map(); // className -> Set of brandNames

  for (const med of normalizedMedicines) {
    for (const ing of med.ingredients) {
      if (!ing.id) continue;

      // Track active ingredient
      if (!ingredientOccurrences.has(ing.id)) {
        ingredientOccurrences.set(ing.id, []);
      }
      ingredientOccurrences.get(ing.id).push({
        brandName: med.brandName,
        ingredientName: ing.name,
        strengthMg: ing.strengthMg
      });

      // Track drug classes
      const classes = ingredientClassesMap.get(ing.id) || [];
      for (const cls of classes) {
        const className = typeof cls === 'object' && cls !== null ? cls.name : String(cls);
        if (!className) continue;
        if (!classOccurrences.has(className)) {
          classOccurrences.set(className, new Set());
        }
        classOccurrences.get(className).add(med.brandName);
      }
    }
  }

  // 1. Check exact active ingredient duplicates
  for (const [, entries] of ingredientOccurrences.entries()) {
    // Unique brands taking this ingredient
    const uniqueBrands = [...new Set(entries.map((e) => e.brandName))];
    if (uniqueBrands.length > 1) {
      const ingName = entries[0].ingredientName;
      const severity = SEVERITY_LEVELS.MAJOR;
      findings.push({
        type: FINDING_TYPES.DUPLICATE,
        severity,
        items: uniqueBrands,
        summary: `Duplicate active ingredient: ${uniqueBrands.join(' and ')} both contain ${ingName}.`,
        explanation: `Taking multiple medicines containing ${ingName} increases the risk of an accidental overdose and toxic cumulative effects.`,
        action: ACTION_TEMPLATES[severity],
        source: 'MedGuard Formulation Rules'
      });
    }
  }

  // 2. Check pharmacological class duplicates (only if not already flagged as exact same ingredient)
  for (const [clsName, brandSet] of classOccurrences.entries()) {
    const brandsInClass = [...brandSet];
    if (brandsInClass.length > 1) {
      // Check if this pair was already reported as an exact ingredient duplicate
      const alreadyFlagged = findings.some(
        (f) => f.items.length === brandsInClass.length && brandsInClass.every((b) => f.items.includes(b))
      );

      if (!alreadyFlagged) {
        const severity = SEVERITY_LEVELS.MODERATE;
        findings.push({
          type: FINDING_TYPES.DUPLICATE,
          severity,
          items: brandsInClass,
          summary: `Multiple medicines belong to the same pharmacological class: ${clsName}.`,
          explanation: `${brandsInClass.join(' and ')} belong to the ${clsName} class. Taking multiple drugs with the same mechanism of action can compound adverse side effects.`,
          action: ACTION_TEMPLATES[severity],
          source: 'MedGuard Drug Class Rules'
        });
      }
    }
  }

  return findings;
}

