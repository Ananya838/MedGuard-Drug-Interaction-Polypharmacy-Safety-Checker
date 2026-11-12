import { FINDING_TYPES, SEVERITY_LEVELS, ACTION_TEMPLATES } from './constants.js';

/**
 * Check 9: Maximum Daily Dose Checker
 * Calculates cumulative daily milligram doses across medicines sharing an active ingredient
 * and compares against age-adjusted limits.
 *
 * Special Rule:
 * For as-needed (PRN) medicines, reports "cannot calculate daily total" instead of guessing.
 * Pure functional module.
 *
 * @param {number} patientAge - Age of patient in years (defaults to 0 if unknown)
 * @param {Array<Object>} normalizedMedicines - Resolved medicines
 * @param {Array<Object>} [scopedDoseLimits=[]] - Dose limits with ageMin and ageMax
 * @returns {Array<Object>} List of dose limit findings
 */
export function checkMaxDose(patientAge = null, normalizedMedicines = [], scopedDoseLimits = []) {
  const findings = [];
  const isAgeKnown = typeof patientAge === 'number' && !isNaN(patientAge);
  const age = isAgeKnown ? patientAge : null;

  // 1. First evaluate PRN medicines: report cannot calculate daily total
  for (const med of normalizedMedicines) {
    if (med.isPrn) {
      findings.push({
        type: FINDING_TYPES.DOSE,
        severity: SEVERITY_LEVELS.INFO,
        items: [med.brandName],
        summary: `Cannot calculate daily total for as-needed (PRN) medicine: ${med.brandName}.`,
        explanation: `${med.brandName} is taken as needed rather than on a fixed schedule. Monitor total doses taken in 24 hours to stay within limits.`,
        action: ACTION_TEMPLATES.info,
        source: 'MedGuard Dosing Guidelines'
      });
    }
  }

  // 2. Sum cumulative scheduled daily dose per ingredient
  const ingredientDailyTotals = new Map(); // ingredientId -> { totalMg, brands: Set, name }

  for (const med of normalizedMedicines) {
    if (med.isPrn) continue; // Skip PRN in daily scheduled summation

    const dosesPerDay = Number(med.dosesPerDay) || 1;
    const doseAmount = Number(med.doseAmount) || 1;

    for (const ing of med.ingredients) {
      if (!ing.id) continue;

      const singleDoseMg = ing.strengthMg * doseAmount;
      const dailyMg = singleDoseMg * dosesPerDay;

      if (!ingredientDailyTotals.has(ing.id)) {
        ingredientDailyTotals.set(ing.id, {
          totalMg: 0,
          brands: new Set(),
          name: ing.name
        });
      }

      const record = ingredientDailyTotals.get(ing.id);
      record.totalMg += dailyMg;
      record.brands.add(med.brandName);
    }
  }

  // 3. Compare totals against age-adjusted limits
  for (const [ingId, record] of ingredientDailyTotals.entries()) {
    // Find matching limit for patient's age (or standard limits if age is unknown)
    const matchingLimits = scopedDoseLimits.filter((l) => {
      const limitIngId = l.ingredientId || l.ingredient_id;
      const minAge = l.ageMin ?? l.age_min ?? 0;
      const maxAge = l.ageMax ?? l.age_max ?? 150;
      if (isAgeKnown) {
        return limitIngId === ingId && age >= minAge && age <= maxAge;
      }
      // Safe unknown-age handling:
      // When age is unknown, do not assume geriatric status (>=65).
      // Only apply limits that cover standard baseline adult ranges (minAge <= 18 and maxAge >= 60).
      return limitIngId === ingId && minAge <= 18 && maxAge >= 60;
    });

    for (const limit of matchingLimits) {
      const maxMg = Number(limit.maxDailyDoseMg || limit.max_daily_dose_mg);
      if (maxMg > 0 && record.totalMg > maxMg) {
        const severity = SEVERITY_LEVELS.MAJOR;
        const brandNames = [...record.brands].join(' and ');
        const ageContext = isAgeKnown ? `In patients aged ${age}` : 'Under standard adult dosing guidelines';

        findings.push({
          type: FINDING_TYPES.DOSE,
          severity,
          items: [...record.brands],
          summary: `Exceeded daily dose limit for ${record.name}: calculated ${record.totalMg}mg/day exceeds the ${maxMg}mg/day limit.`,
          explanation: `Cumulative intake of ${record.name} across ${brandNames} reaches ${record.totalMg}mg daily. ${ageContext}, the recommended maximum daily limit is ${maxMg}mg.`,
          action: ACTION_TEMPLATES[severity],
          source: limit.source || 'Standard Clinical Pharmacology Limits'
        });
      }
    }
  }

  return findings;
}

