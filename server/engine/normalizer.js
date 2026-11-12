/**
 * Check 1: Normalizer
 * Resolves commercial brands, applies ingredient synonyms, expands combination products
 * (e.g. Pan-D -> pantoprazole + domperidone), and preserves unrecognized items.
 * Pure functional module.
 */

/**
 * Normalizes confirmed medicine entries.
 *
 * @param {Array<Object>} confirmedMedicines - Medicines confirmed by the caregiver
 * @param {Object} catalog - Pre-loaded in-memory catalog
 * @param {Map<number, Object>} catalog.brandsById - Map of brandId to brand object
 * @param {Map<string, Object>} [catalog.brandsByName] - Map of lower(brandName) to brand object
 * @param {Map<string, number>} [catalog.synonyms] - Map of synonym to canonical ingredientId
 * @param {Map<number, Object>} [catalog.ingredientsById] - Map of ingredientId to ingredient info
 * @param {Array<string>} [initialUnrecognized=[]] - Initial unrecognized raw strings from request
 * @returns {{ resolved: Array<Object>, unrecognized: Array<Object> }}
 */
export function normalize(confirmedMedicines = [], catalog = {}, initialUnrecognized = []) {
  const brandsById = catalog.brandsById || new Map();
  const brandsByName = catalog.brandsByName || new Map();
  const synonyms = catalog.synonyms || new Map();
  const ingredientsById = catalog.ingredientsById || new Map();

  const resolved = [];
  const unrecognized = [];

  // Carry over any items flagged as unrecognized before the check
  if (Array.isArray(initialUnrecognized)) {
    for (const item of initialUnrecognized) {
      unrecognized.push({
        input: typeof item === 'string' ? item : (item.input || String(item)),
        reason: 'Could not identify active ingredients in catalog. Please show this packaging to a doctor or pharmacist.'
      });
    }
  }

  for (const item of confirmedMedicines) {
    let brand = null;

    if (item.brandId && brandsById.has(item.brandId)) {
      brand = brandsById.get(item.brandId);
    } else if (item.brandName && brandsByName.has(item.brandName.toLowerCase().trim())) {
      brand = brandsByName.get(item.brandName.toLowerCase().trim());
    } else if (item.customName && brandsByName.has(item.customName.toLowerCase().trim())) {
      brand = brandsByName.get(item.customName.toLowerCase().trim());
    }

    if (!brand) {
      // Unrecognized item - NEVER drop silently!
      unrecognized.push({
        input: item.customName || item.brandName || `Brand ID ${item.brandId}`,
        reason: 'Not found in approved medicine catalog. Please show packaging to a doctor or pharmacist.'
      });
      continue;
    }

    // Resolve ingredients (handling synonyms and combination products)
    const expandedIngredients = [];
    const brandIngredients = brand.ingredients || [];

    for (const ing of brandIngredients) {
      let finalId = ing.id;
      let finalName = ing.name;

      // Check synonym if name is available
      if (ing.name && synonyms.has(ing.name.toLowerCase().trim())) {
        finalId = synonyms.get(ing.name.toLowerCase().trim());
        if (ingredientsById.has(finalId)) {
          finalName = ingredientsById.get(finalId).name;
        }
      }

      expandedIngredients.push({
        id: finalId,
        name: finalName,
        strengthMg: Number(ing.strengthMg) || 0
      });
    }

    resolved.push({
      brandId: brand.id,
      brandName: brand.brandName,
      doseAmount: item.doseAmount ?? 1,
      doseUnit: item.doseUnit || 'tablet',
      dosesPerDay: Number(item.dosesPerDay) || 1,
      isPrn: Boolean(item.isPrn ?? item.is_prn),
      frequencyText: item.frequencyText || '',
      timingSchedule: Array.isArray(item.timingSchedule) ? item.timingSchedule : [],
      ingredients: expandedIngredients
    });
  }

  return { resolved, unrecognized };
}

