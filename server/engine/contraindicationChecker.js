import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 6: Disease-Drug Contraindication Checker
 * Evaluates controlled patient condition codes (e.g. 'CKD', 'ASTHMA')
 * against contraindications for the confirmed medicines.
 * Pure functional module.
 *
 * @param {Array<string>} patientConditions - Array of uppercase condition codes (e.g. ['CKD'])
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Array<Object>} [scopedContraindications=[]] - Contraindication rules
 * @returns {Array<Object>} List of contraindication findings
 */
export function checkContraindications(patientConditions = [], normalizedMedicines = [], scopedContraindications = []) {
  const findings = [];
  if (!Array.isArray(patientConditions) || patientConditions.length === 0) {
    return findings;
  }

  const conditionSet = new Set(patientConditions.map((c) => String(c).toUpperCase().trim()));

  // Map ingredientId -> array of contraindication rules
  const ruleMap = new Map();
  for (const rule of scopedContraindications) {
    const code = (rule.conditionCode || rule.condition_code || '').toUpperCase().trim();
    if (conditionSet.has(code)) {
      if (!ruleMap.has(rule.ingredientId || rule.ingredient_id)) {
        ruleMap.set(rule.ingredientId || rule.ingredient_id, []);
      }
      ruleMap.get(rule.ingredientId || rule.ingredient_id).push(rule);
    }
  }

  for (const med of normalizedMedicines) {
    for (const ing of med.ingredients) {
      if (!ing.id || !ruleMap.has(ing.id)) continue;

      for (const rule of ruleMap.get(ing.id)) {
        const severity = (rule.severity || SEVERITY_LEVELS.MAJOR).toLowerCase();
        const code = (rule.conditionCode || rule.condition_code).toUpperCase();

        findings.push({
          type: FINDING_TYPES.CONTRAINDICATION,
          severity,
          items: [med.brandName, code],
          summary: `Medical condition warning: ${med.brandName} is contraindicated with ${code}.`,
          explanation: rule.description || `${ing.name} has documented clinical risks for patients diagnosed with ${code}.`,
          action: ACTION_TEMPLATES[severity] || ACTION_TEMPLATES.major,
          source: rule.source || 'Clinical Pharmacology Guidelines'
        });
      }
    }
  }

  return findings;
}

