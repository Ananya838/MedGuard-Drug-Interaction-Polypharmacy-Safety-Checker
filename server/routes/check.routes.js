import { Router } from 'express';
import { getPool } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkRateLimiter } from '../middleware/rateLimiter.js';
import { runAllChecks } from '../engine/index.js';

export const checkRouter = Router();

// Protect safety check endpoint with JWT and apply rate limiting (30 requests/minute)
checkRouter.use(authenticate);

const rateLimiter = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : checkRateLimiter;
checkRouter.use(rateLimiter);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_BODY_KEYS = new Set(['patientId', 'confirmedMedicines', 'unrecognized']);
const ALLOWED_MEDICINE_KEYS = new Set([
  'brandId',
  'doseAmount',
  'doseUnit',
  'dosesPerDay',
  'isPrn',
  'frequencyText',
  'timingSchedule',
]);

/**
 * Calculates patient age in completed years from date of birth string.
 * Returns null if dobString is missing, empty, invalid, in the future, or out of realistic range.
 * Never defaults to arbitrary ages (e.g. 50).
 */
function calculateAge(dobString) {
  if (!dobString || typeof dobString !== 'string') return null;
  const trimmed = dobString.trim();
  if (!trimmed) return null;

  const birth = new Date(trimmed);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  if (birth > today) return null; // Future DOB is invalid

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 0 || age > 130) return null;
  return age;
}

/**
 * POST /api/check
 * Evaluates polypharmacy safety deterministically using the pure safety engine.
 * STRICT INPUT BOUNDARY: Confirmed brand IDs and unrecognized list ONLY.
 * Free-text or unconfirmed medicine names are rejected immediately.
 */
checkRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be a JSON object.',
        },
      });
    }

    // 1. Reject unexpected top-level fields
    for (const key of Object.keys(body)) {
      if (!ALLOWED_BODY_KEYS.has(key)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Unexpected field in request: "${key}".`,
          },
        });
      }
    }

    const { patientId, confirmedMedicines = [], unrecognized = [] } = body;

    // 2. Validate patientId if provided
    if (patientId !== undefined && patientId !== null) {
      if (typeof patientId !== 'string' || !UUID_REGEX.test(patientId.trim())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '"patientId" must be a valid UUID string.',
          },
        });
      }
    }

    // 3. Validate confirmedMedicines array structure
    if (!Array.isArray(confirmedMedicines)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '"confirmedMedicines" must be an array.',
        },
      });
    }

    // 4. Validate unrecognized array structure
    if (!Array.isArray(unrecognized)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '"unrecognized" must be an array.',
        },
      });
    }

    // 5. Must have at least one confirmed medicine or unrecognized item
    if (confirmedMedicines.length === 0 && unrecognized.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one confirmed medicine or unrecognized item is required to run a check.',
        },
      });
    }

    // 6. Strict validation of every item in unrecognized array
    const cleanUnrecognized = [];
    for (let i = 0; i < unrecognized.length; i++) {
      const item = unrecognized[i];
      if (typeof item !== 'string' || item.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Every item in "unrecognized" must be a non-empty string (invalid item at index ${i}).`,
          },
        });
      }
      if (item.trim().length > 255) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Item at index ${i} in "unrecognized" exceeds the maximum length of 255 characters.`,
          },
        });
      }
      cleanUnrecognized.push(item.trim());
    }

    // 7. Strict validation of every item in confirmedMedicines
    for (let i = 0; i < confirmedMedicines.length; i++) {
      const med = confirmedMedicines[i];
      if (typeof med !== 'object' || med === null || Array.isArray(med)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Medicine entry at index ${i} must be an object.`,
          },
        });
      }

      // Check unexpected fields in medicine item
      for (const mKey of Object.keys(med)) {
        if (!ALLOWED_MEDICINE_KEYS.has(mKey)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Unexpected field "${mKey}" in medicine entry at index ${i}. Raw or unconfirmed medicine text must be normalized via /api/medicines/normalize first.`,
            },
          });
        }
      }

      // brandId validation
      if (
        typeof med.brandId !== 'number' ||
        !Number.isInteger(med.brandId) ||
        med.brandId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'All medicines in confirmedMedicines must contain a valid integer brandId. Raw or unconfirmed medicine text must be normalized via /api/medicines/normalize first.',
          },
        });
      }

      // doseAmount validation
      if (
        med.doseAmount !== undefined &&
        (typeof med.doseAmount !== 'number' || isNaN(med.doseAmount) || med.doseAmount <= 0)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `"doseAmount" at index ${i} must be a positive number.`,
          },
        });
      }

      // dosesPerDay validation
      if (
        med.dosesPerDay !== undefined &&
        (!Number.isInteger(med.dosesPerDay) || med.dosesPerDay <= 0)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `"dosesPerDay" at index ${i} must be a positive integer.`,
          },
        });
      }

      // isPrn validation
      if (med.isPrn !== undefined && typeof med.isPrn !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `"isPrn" at index ${i} must be a boolean.`,
          },
        });
      }

      // doseUnit validation
      if (
        med.doseUnit !== undefined &&
        (typeof med.doseUnit !== 'string' || med.doseUnit.length > 50)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `"doseUnit" at index ${i} must be a string (max 50 characters).`,
          },
        });
      }

      // frequencyText validation
      if (
        med.frequencyText !== undefined &&
        (typeof med.frequencyText !== 'string' || med.frequencyText.length > 100)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `"frequencyText" at index ${i} must be a string (max 100 characters).`,
          },
        });
      }

      // timingSchedule validation
      if (med.timingSchedule !== undefined && !Array.isArray(med.timingSchedule)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `"timingSchedule" at index ${i} must be an array.`,
          },
        });
      }
    }

    const pool = getPool();

    // 8. Resolve patient profile (if patientId provided)
    // Default age is null (safe unknown-age handling)
    let patientProfile = { age: null, allergies: [], conditions: [] };

    if (patientId) {
      const patientRes = await pool.query(
        `SELECT id, name, dob, weight_kg, allergies, conditions
         FROM patients
         WHERE id = $1 AND (
           caregiver_id = $2 OR
           id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $2)
         )`,
        [patientId.trim(), req.user.id]
      );

      if (patientRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient profile not found or you do not have permission to access it.',
          },
        });
      }

      const p = patientRes.rows[0];
      patientProfile = {
        age: calculateAge(p.dob),
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
        conditions: Array.isArray(p.conditions) ? p.conditions : [],
      };
    }

    // 9. Database Brand Verification & Active Ingredient Mapping Checks
    const brandIds = [...new Set(confirmedMedicines.map((m) => m.brandId))];
    const brandsById = new Map();
    const ingredientsById = new Map();

    if (brandIds.length > 0) {
      // 9a. Verify that every submitted brandId exists in the brands table
      const brandCatalogRes = await pool.query(
        `SELECT b.id, b.brand_name
         FROM brands b
         WHERE b.id = ANY($1::int[])`,
        [brandIds]
      );

      const foundBrandMap = new Map(brandCatalogRes.rows.map((b) => [b.id, b.brand_name]));

      for (const id of brandIds) {
        if (!foundBrandMap.has(id)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Brand ID ${id} was not found in the medicine catalog.`,
            },
          });
        }
      }

      // 9b. Fetch active ingredient mappings for these brands
      const brandRows = await pool.query(
        `SELECT b.id AS brand_id, b.brand_name, bi.ingredient_id, i.name AS ingredient_name, bi.strength_mg
         FROM brands b
         JOIN brand_ingredients bi ON b.id = bi.brand_id
         JOIN ingredients i ON bi.ingredient_id = i.id
         WHERE b.id = ANY($1::int[])`,
        [brandIds]
      );

      for (const row of brandRows.rows) {
        const strength = Number(row.strength_mg);
        if (!row.ingredient_id || isNaN(strength) || strength <= 0) {
          continue; // skip invalid mapping record
        }

        if (!brandsById.has(row.brand_id)) {
          brandsById.set(row.brand_id, {
            id: row.brand_id,
            brandName: row.brand_name,
            ingredients: [],
          });
        }
        brandsById.get(row.brand_id).ingredients.push({
          id: row.ingredient_id,
          name: row.ingredient_name,
          strengthMg: strength,
        });

        ingredientsById.set(row.ingredient_id, {
          id: row.ingredient_id,
          name: row.ingredient_name,
        });
      }

      // 9c. Reject any brand that has missing or invalid active ingredient mappings
      for (const id of brandIds) {
        const brandName = foundBrandMap.get(id);
        const resolvedBrand = brandsById.get(id);
        if (!resolvedBrand || resolvedBrand.ingredients.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Brand ID ${id} ("${brandName}") has missing or invalid active ingredient mappings in the catalog.`,
            },
          });
        }
      }
    }

    // Collect all unique active ingredient IDs across confirmed medicines
    const ingredientIds = Array.from(ingredientsById.keys());

    // 10. TARGETED / SCOPED RULE LOADING:
    // Only query database rules matching the active ingredient IDs involved in this request
    let scopedInteractions = [];
    let scopedTimingRules = [];
    let scopedBeersRules = [];
    let scopedContraindications = [];
    let scopedFoodRules = [];
    let scopedDoseLimits = [];
    const ingredientClassesMap = new Map();

    if (ingredientIds.length > 0) {
      // 1. Scoped pairwise interactions
      const interRes = await pool.query(
        `SELECT ingredient_a AS "ingredientA", ingredient_b AS "ingredientB", severity, summary, explanation, source
         FROM interactions
         WHERE ingredient_a = ANY($1::int[]) AND ingredient_b = ANY($1::int[])`,
        [ingredientIds]
      );
      scopedInteractions = interRes.rows;

      // 2. Scoped timing rules
      const timingRes = await pool.query(
        `SELECT ingredient_a AS "ingredientA", ingredient_b AS "ingredientB", min_gap_hours AS "minGapHours", severity, advice, source
         FROM timing_rules
         WHERE ingredient_a = ANY($1::int[]) AND ingredient_b = ANY($1::int[])`,
        [ingredientIds]
      );
      scopedTimingRules = timingRes.rows;

      // 3. Scoped Beers criteria rules
      const beersRes = await pool.query(
        `SELECT ingredient_id AS "ingredientId", rationale, recommendation, severity, source
         FROM beers_rules
         WHERE ingredient_id = ANY($1::int[])`,
        [ingredientIds]
      );
      scopedBeersRules = beersRes.rows;

      // 4. Scoped condition contraindications
      const contraRes = await pool.query(
        `SELECT ingredient_id AS "ingredientId", condition_code AS "conditionCode", severity, description, source
         FROM contraindications
         WHERE ingredient_id = ANY($1::int[])`,
        [ingredientIds]
      );
      scopedContraindications = contraRes.rows;

      // 5. Scoped food and dietary interactions
      const foodRes = await pool.query(
        `SELECT ingredient_id AS "ingredientId", item, severity, description, source
         FROM food_interactions
         WHERE ingredient_id = ANY($1::int[])`,
        [ingredientIds]
      );
      scopedFoodRules = foodRes.rows;

      // 6. Scoped dose limits
      const doseRes = await pool.query(
        `SELECT ingredient_id AS "ingredientId", age_min AS "ageMin", age_max AS "ageMax", max_daily_dose_mg AS "maxDailyDoseMg", rationale, source
         FROM dose_limits
         WHERE ingredient_id = ANY($1::int[])`,
        [ingredientIds]
      );
      scopedDoseLimits = doseRes.rows;

      // 7. Scoped ingredient-to-drug-class mappings
      const classRes = await pool.query(
        `SELECT idc.ingredient_id, dc.id AS class_id, dc.name AS class_name
         FROM ingredient_drug_classes idc
         JOIN drug_classes dc ON idc.drug_class_id = dc.id
         WHERE idc.ingredient_id = ANY($1::int[])`,
        [ingredientIds]
      );

      for (const row of classRes.rows) {
        if (!ingredientClassesMap.has(row.ingredient_id)) {
          ingredientClassesMap.set(row.ingredient_id, []);
        }
        ingredientClassesMap.get(row.ingredient_id).push({
          id: row.class_id,
          name: row.class_name,
        });
      }
    }

    // 11. Assemble Scoped Rules for Pure Engine
    const scopedRules = {
      brandCatalog: {
        brandsById,
        brandsByName: new Map(),
        synonyms: new Map(),
        ingredientsById,
      },
      ingredientClassesMap,
      scopedInteractions,
      scopedTimingRules,
      scopedBeersRules,
      scopedContraindications,
      scopedFoodRules,
      scopedDoseLimits,
    };

    // 12. Execute 100% Deterministic Safety Engine (Zero Network / Zero DB inside engine)
    const report = runAllChecks(
      patientProfile,
      confirmedMedicines,
      scopedRules,
      cleanUnrecognized
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});
