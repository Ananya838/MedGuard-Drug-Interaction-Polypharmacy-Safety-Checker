/**
 * MedGuard Core Safety Engine
 * 
 * Orchestrates all 9 deterministic polypharmacy safety checks.
 * Input: Confirmed medicines + Patient profile + In-memory scoped rule sets.
 * Output: Standardized clinical safety report (PRD Section 8 format).
 * 
 * Non-negotiable safety rules:
 * - 100% deterministic (no LLM, no AI guessing).
 * - Zero network and zero database calls during check execution.
 * - Severity comes from source data, never from code.
 * - Actions come from fixed severity templates in constants.js.
 * - Never use the word "safe". If no findings: "No known interaction found in our data."
 * - Unrecognized items are always reported and never dropped silently.
 */

import { SEVERITY_LEVELS, ACTION_TEMPLATES, NO_INTERACTION_MESSAGE, MANDATORY_DISCLAIMER } from './constants.js';
import { normalize } from './normalizer.js';
import { checkDuplicates } from './duplicateChecker.js';
import { checkInteractions } from './interactionChecker.js';
import { checkTiming } from './timingChecker.js';
import { checkAllergies } from './allergyChecker.js';
import { checkContraindications } from './contraindicationChecker.js';
import { checkBeers } from './beersChecker.js';
import { checkFood } from './foodChecker.js';
import { checkMaxDose } from './doseChecker.js';

// Export all individual checks for granular unit testing
export {
  normalize,
  checkDuplicates,
  checkInteractions,
  checkTiming,
  checkAllergies,
  checkContraindications,
  checkBeers,
  checkFood,
  checkMaxDose
};

/**
 * Runs all 9 deterministic safety checks.
 *
 * @param {Object} patient - Patient profile
 * @param {number} [patient.age] - Patient age in years
 * @param {Array<Object>} [patient.allergies=[]] - Controlled allergies
 * @param {Array<string>} [patient.conditions=[]] - Controlled condition codes
 * @param {Array<Object>} confirmedMedicines - Confirmed medicine entries
 * @param {Object} scopedRules - Scoped in-memory rules and catalog
 * @param {Array<string>} [initialUnrecognized=[]] - Raw items not identified during entry
 * @returns {Object} Structured report in PRD section 8 format
 */
export function runAllChecks(patient = {}, confirmedMedicines = [], scopedRules = {}, initialUnrecognized = []) {
  const patientAge = typeof patient.age === 'number' && !isNaN(patient.age)
    ? patient.age
    : (patient.dob ? calculateAge(patient.dob) : null);
  const patientAllergies = Array.isArray(patient.allergies) ? patient.allergies : [];
  const patientConditions = Array.isArray(patient.conditions) ? patient.conditions : [];

  // Check 1: Normalization (expands brands, combinations, synonyms, captures unrecognized)
  const { resolved: normalizedMedicines, unrecognized } = normalize(
    confirmedMedicines,
    scopedRules.brandCatalog || {},
    initialUnrecognized
  );

  // Check 2: Duplicates
  const duplicateFindings = checkDuplicates(
    normalizedMedicines,
    scopedRules.ingredientClassesMap || new Map()
  );

  // Check 3: Pairwise Interactions
  const interactionFindings = checkInteractions(
    normalizedMedicines,
    scopedRules.scopedInteractions || new Map()
  );

  // Check 4: Timing Conflicts
  const timingFindings = checkTiming(
    normalizedMedicines,
    scopedRules.scopedTimingRules || new Map()
  );

  // Check 5: Allergies
  const allergyFindings = checkAllergies(
    patientAllergies,
    normalizedMedicines,
    scopedRules.ingredientClassesMap || new Map()
  );

  // Check 6: Contraindications
  const contraindicationFindings = checkContraindications(
    patientConditions,
    normalizedMedicines,
    scopedRules.scopedContraindications || []
  );

  // Check 7: Beers Criteria (Age >= 65)
  const beersFindings = checkBeers(
    patientAge,
    normalizedMedicines,
    scopedRules.scopedBeersRules || []
  );

  // Check 8: Food and Alcohol Conflicts
  const foodFindings = checkFood(
    normalizedMedicines,
    scopedRules.scopedFoodRules || []
  );

  // Check 9: Maximum Daily Dose (Age-adjusted limits; PRN flagged)
  const doseFindings = checkMaxDose(
    patientAge,
    normalizedMedicines,
    scopedRules.scopedDoseLimits || []
  );

  // Aggregate all findings
  const allFindings = [
    ...duplicateFindings,
    ...interactionFindings,
    ...timingFindings,
    ...allergyFindings,
    ...contraindicationFindings,
    ...beersFindings,
    ...foodFindings,
    ...doseFindings
  ];

  // Sort by clinical severity: Major > Moderate > Minor > Info
  const severityRank = {
    [SEVERITY_LEVELS.MAJOR]: 1,
    [SEVERITY_LEVELS.MODERATE]: 2,
    [SEVERITY_LEVELS.MINOR]: 3,
    [SEVERITY_LEVELS.INFO]: 4
  };

  allFindings.sort((a, b) => {
    const rankA = severityRank[a.severity] || 99;
    const rankB = severityRank[b.severity] || 99;
    return rankA - rankB;
  });

  // If no conflict findings are found, explicitly state "No known interaction found in our data."
  // NEVER use the word "safe".
  if (allFindings.length === 0) {
    allFindings.push({
      type: 'interaction',
      severity: SEVERITY_LEVELS.INFO,
      items: normalizedMedicines.map((m) => m.brandName),
      summary: NO_INTERACTION_MESSAGE,
      explanation: 'No known interactions, duplicates, or contraindications were found for these medicines in our database.',
      action: ACTION_TEMPLATES.info,
      source: 'MedGuard Deterministic Safety Database'
    });
  }

  // Calculate summary counts
  const majorCount = allFindings.filter((f) => f.severity === SEVERITY_LEVELS.MAJOR).length;
  const moderateCount = allFindings.filter((f) => f.severity === SEVERITY_LEVELS.MODERATE).length;
  const minorCount = allFindings.filter((f) => f.severity === SEVERITY_LEVELS.MINOR).length;

  let overallStatus = 'clear';
  if (majorCount > 0) overallStatus = SEVERITY_LEVELS.MAJOR;
  else if (moderateCount > 0) overallStatus = SEVERITY_LEVELS.MODERATE;
  else if (minorCount > 0) overallStatus = SEVERITY_LEVELS.MINOR;

  return {
    summary: {
      overallStatus,
      totalFindings: allFindings.length,
      majorCount,
      moderateCount,
      minorCount,
      unrecognizedCount: unrecognized.length
    },
    findings: allFindings,
    unrecognized,
    disclaimer: MANDATORY_DISCLAIMER
  };
}

function calculateAge(dobString) {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  if (birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0 || age > 130) return null;
  return age;
}

