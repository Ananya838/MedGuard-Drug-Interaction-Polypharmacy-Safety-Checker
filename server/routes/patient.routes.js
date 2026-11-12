import { Router } from 'express';
import { withUserTransaction, getPool } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { generateDoctorPdfReport } from './pdfReport.js';
import { runAllChecks } from '../engine/index.js';

export const patientRouter = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Protect all patient endpoints with JWT authentication
patientRouter.use(authenticate);

/**
 * GET /api/patients
 * Retrieves all patient profiles accessible by the authenticated caregiver.
 * Primary protection: WHERE caregiver_id = req.user.id OR ...
 * Secondary protection: SET LOCAL app.current_user_id inside withUserTransaction.
 */
patientRouter.get('/', async (req, res, next) => {
  try {
    const patients = await withUserTransaction(req.user.id, async (client) => {
      const result = await client.query(
        `SELECT id, name, dob, weight_kg AS "weightKg", allergies, conditions, created_at, updated_at,
                COALESCE(
                  (SELECT json_agg(
                     json_build_object(
                       'id', pm.id,
                       'brand_id', pm.brand_id,
                       'brandId', pm.brand_id,
                       'brandName', COALESCE(b.brand_name, pm.custom_name, 'Medicine'),
                       'genericName', COALESCE(b.strength_raw, pm.custom_name, ''),
                       'dosage', pm.frequency_text,
                       'timing', pm.timing_schedule,
                       'isPrn', pm.is_prn
                     ) ORDER BY pm.created_at DESC
                   )
                   FROM patient_medicines pm
                   LEFT JOIN brands b ON pm.brand_id = b.id
                   WHERE pm.patient_id = patients.id AND pm.active = true),
                  '[]'::json
                ) AS medicines
         FROM patients
         WHERE caregiver_id = $1 OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $1)
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      return result.rows;
    });

    res.status(200).json({
      success: true,
      data: patients,
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * POST /api/patients
 * Creates a new patient profile associated with the authenticated caregiver.
 */
patientRouter.post('/', async (req, res, next) => {
  try {
    const { name, dob, weightKg, allergies = [], conditions = [] } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Patient name is required.' },
      });
    }

    if (!dob || isNaN(new Date(dob).getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A valid date of birth (dob) is required (YYYY-MM-DD).' },
      });
    }

    const patient = await withUserTransaction(req.user.id, async (client) => {
      const result = await client.query(
        `INSERT INTO patients (caregiver_id, name, dob, weight_kg, allergies, conditions)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, dob, weight_kg AS "weightKg", allergies, conditions, created_at, updated_at`,
        [
          req.user.id,
          name.trim(),
          dob,
          weightKg ? Number(weightKg) : null,
          JSON.stringify(Array.isArray(allergies) ? allergies : []),
          JSON.stringify(Array.isArray(conditions) ? conditions : []),
        ]
      );
      return result.rows[0];
    });

    res.status(201).json({
      success: true,
      data: { patient },
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * GET /api/patients/:id
 * Fetches a single patient profile if the caregiver owns it or has granted access.
 */
patientRouter.get('/:id', async (req, res, next) => {
  try {
    const patient = await withUserTransaction(req.user.id, async (client) => {
      const result = await client.query(
        `SELECT p.id, p.name, p.dob, p.weight_kg AS "weightKg", p.allergies, p.conditions, p.created_at, p.updated_at,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', pm.id,
                      'patient_id', pm.patient_id,
                      'brand_id', pm.brand_id,
                      'brandId', pm.brand_id,
                      'brandName', COALESCE(b.brand_name, pm.custom_name, 'Medicine'),
                      'brand_name', b.brand_name,
                      'manufacturer', b.manufacturer,
                      'custom_name', pm.custom_name,
                      'doseAmount', pm.dose_amount,
                      'doseUnit', pm.dose_unit,
                      'dosage', CONCAT(pm.dose_amount, ' ', COALESCE(pm.dose_unit, 'tablet')),
                      'dosesPerDay', pm.doses_per_day,
                      'isPrn', pm.is_prn,
                      'frequencyText', pm.frequency_text,
                      'timing', pm.timing_schedule,
                      'timing_schedule', pm.timing_schedule,
                      'active', pm.active,
                      'createdAt', pm.created_at
                    )
                  ) FILTER (WHERE pm.id IS NOT NULL),
                  '[]'
                ) AS medicines
         FROM patients p
         LEFT JOIN patient_medicines pm ON pm.patient_id = p.id AND pm.active = true
         LEFT JOIN brands b ON pm.brand_id = b.id
         WHERE p.id = $1 AND (p.caregiver_id = $2 OR p.id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $2))
         GROUP BY p.id`,
        [req.params.id, req.user.id]
      );
      return result.rows[0];
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found or permission denied.' },
      });
    }

    res.status(200).json({
      success: true,
      data: { patient },
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * PUT /api/patients/:id
 * Updates an existing patient profile.
 */
patientRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, dob, weightKg, allergies, conditions } = req.body || {};

    const updated = await withUserTransaction(req.user.id, async (client) => {
      // Check ownership
      const checkRes = await client.query(
        `SELECT id FROM patients WHERE id = $1 AND caregiver_id = $2`,
        [req.params.id, req.user.id]
      );

      if (checkRes.rows.length === 0) {
        return null;
      }

      const result = await client.query(
        `UPDATE patients
         SET name = COALESCE($1, name),
             dob = COALESCE($2, dob),
             weight_kg = COALESCE($3, weight_kg),
             allergies = COALESCE($4, allergies),
             conditions = COALESCE($5, conditions),
             updated_at = NOW()
         WHERE id = $6 AND caregiver_id = $7
         RETURNING id, name, dob, weight_kg AS "weightKg", allergies, conditions, updated_at`,
        [
          name ? name.trim() : null,
          dob || null,
          weightKg ? Number(weightKg) : null,
          allergies ? JSON.stringify(allergies) : null,
          conditions ? JSON.stringify(conditions) : null,
          req.params.id,
          req.user.id,
        ]
      );
      return result.rows[0];
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found or permission denied.' },
      });
    }

    res.status(200).json({
      success: true,
      data: { patient: updated },
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * DELETE /api/patients/:id
 * Permanently deletes a patient profile and cascades deletion of active medicines.
 */
patientRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await withUserTransaction(req.user.id, async (client) => {
      const result = await client.query(
        `DELETE FROM patients WHERE id = $1 AND caregiver_id = $2 RETURNING id`,
        [req.params.id, req.user.id]
      );
      return result.rows.length > 0;
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found or permission denied.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient profile permanently deleted.',
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * GET /api/patients/:id/medicines
 * Lists active medications currently taken by the patient.
 */
patientRouter.get('/:id/medicines', async (req, res, next) => {
  try {
    const medicines = await withUserTransaction(req.user.id, async (client) => {
      // Validate caregiver access to patient
      const accessRes = await client.query(
        `SELECT id FROM patients WHERE id = $1 AND (caregiver_id = $2 OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $2))`,
        [req.params.id, req.user.id]
      );
      if (accessRes.rows.length === 0) return null;

      const result = await client.query(
        `SELECT pm.id, pm.patient_id, pm.brand_id, b.brand_name, b.manufacturer,
                pm.custom_name, pm.dose_amount, pm.dose_unit, pm.doses_per_day,
                pm.is_prn, pm.frequency_text, pm.timing_schedule, pm.active, pm.created_at
         FROM patient_medicines pm
         LEFT JOIN brands b ON pm.brand_id = b.id
         WHERE pm.patient_id = $1 AND pm.active = true
         ORDER BY pm.created_at DESC`,
        [req.params.id]
      );
      return result.rows;
    });

    if (medicines === null) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found or permission denied.' },
      });
    }

    res.status(200).json({
      success: true,
      data: medicines,
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * POST /api/patients/:id/medicines
 * Adds a confirmed medicine to the patient's active medication list.
 */
patientRouter.post('/:id/medicines', async (req, res, next) => {
  try {
    const {
      brandId,
      customName,
      doseAmount = 1,
      doseUnit = 'tablet',
      dosesPerDay = 1,
      isPrn = false,
      frequencyText = '',
      timingSchedule = [],
      timing,
      dosage,
    } = req.body || {};

    const finalTiming = (Array.isArray(timingSchedule) && timingSchedule.length > 0)
      ? timingSchedule
      : (Array.isArray(timing) ? timing : ['Morning']);

    const finalFrequency = frequencyText || (dosage ? String(dosage) : '');

    const added = await withUserTransaction(req.user.id, async (client) => {
      // Validate caregiver ownership/access
      const accessRes = await client.query(
        `SELECT id FROM patients WHERE id = $1 AND (caregiver_id = $2 OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $2))`,
        [req.params.id, req.user.id]
      );
      if (accessRes.rows.length === 0) return null;

      const result = await client.query(
        `INSERT INTO patient_medicines (
           patient_id, brand_id, custom_name, dose_amount, dose_unit,
           doses_per_day, is_prn, frequency_text, timing_schedule
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, patient_id, brand_id, custom_name, dose_amount, dose_unit,
                   doses_per_day, is_prn, frequency_text, timing_schedule, created_at`,
        [
          req.params.id,
          brandId ? Number(brandId) : null,
          customName || null,
          Number(doseAmount) || 1,
          doseUnit || 'tablet',
          Number(dosesPerDay) || 1,
          Boolean(isPrn),
          finalFrequency,
          JSON.stringify(finalTiming),
        ]
      );

      const inserted = result.rows[0];
      if (inserted && inserted.brand_id) {
        const bRes = await client.query(
          `SELECT brand_name, manufacturer, strength_raw, form FROM brands WHERE id = $1`,
          [inserted.brand_id]
        );
        if (bRes.rows.length > 0) {
          inserted.brand_name = bRes.rows[0].brand_name;
          inserted.manufacturer = bRes.rows[0].manufacturer;
          inserted.strength_raw = bRes.rows[0].strength_raw;
          inserted.form = bRes.rows[0].form;
        }
      }
      return inserted;
    });

    if (!added) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found or permission denied.' },
      });
    }

    res.status(201).json({
      success: true,
      data: { medicine: added },
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

/**
 * DELETE /api/patients/:id/medicines/:medId
 * Removes or deactivates a medicine from the patient's regimen.
 */
patientRouter.delete('/:id/medicines/:medId', async (req, res, next) => {
  try {
    const deleted = await withUserTransaction(req.user.id, async (client) => {
      const result = await client.query(
        `DELETE FROM patient_medicines pm
         USING patients p
         WHERE pm.id = $1 AND pm.patient_id = $2 AND pm.patient_id = p.id AND (
           p.caregiver_id = $3 OR p.id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $3)
         )
         RETURNING pm.id`,
        [req.params.medId, req.params.id, req.user.id]
      );
      return result.rows.length > 0;
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Medicine record not found or permission denied.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine successfully removed from active regimen.',
    });
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient medicine record not found.' },
      });
    }
    next(err);
  }
});

/**
 * GET /api/patients/:id/report.pdf
 * Generates and streams a doctor-ready one-page clinical summary report PDF.
 */
patientRouter.get('/:id/report.pdf', async (req, res, next) => {
  try {
    const pool = getPool();

    // 1. Fetch patient profile
    const patientRes = await pool.query(
      `SELECT id, name, dob, weight_kg, allergies, conditions
       FROM patients
       WHERE id = $1 AND (caregiver_id = $2 OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = $2))`,
      [req.params.id, req.user.id]
    );

    if (patientRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found or permission denied.' },
      });
    }

    const patient = patientRes.rows[0];

    // 2. Fetch active medicines
    const medRes = await pool.query(
      `SELECT pm.id, pm.brand_id, b.brand_name, pm.custom_name, pm.dose_amount,
              pm.dose_unit, pm.doses_per_day, pm.is_prn, pm.frequency_text
       FROM patient_medicines pm
       LEFT JOIN brands b ON pm.brand_id = b.id
       WHERE pm.patient_id = $1 AND pm.active = true`,
      [patient.id]
    );

    const activeMeds = medRes.rows;

    // 3. Run check on active medicines if brands exist
    const confirmedMeds = activeMeds
      .filter((m) => m.brand_id)
      .map((m) => ({
        brandId: m.brand_id,
        doseAmount: m.dose_amount,
        doseUnit: m.dose_unit,
        dosesPerDay: m.doses_per_day,
        isPrn: m.is_prn,
      }));

    // Scoped rules for active medicines
    const brandIds = confirmedMeds.map((m) => m.brandId);
    let scopedRules = {};

    if (brandIds.length > 0) {
      const brandRows = await pool.query(
        `SELECT b.id AS brand_id, b.brand_name, bi.ingredient_id, i.name AS ingredient_name, bi.strength_mg
         FROM brands b
         JOIN brand_ingredients bi ON b.id = bi.brand_id
         JOIN ingredients i ON bi.ingredient_id = i.id
         WHERE b.id = ANY($1::int[])`,
        [brandIds]
      );

      const brandsById = new Map();
      const ingredientIds = [];

      for (const row of brandRows.rows) {
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
          strengthMg: Number(row.strength_mg) || 0,
        });
        ingredientIds.push(row.ingredient_id);
      }

      const interRes = await pool.query(
        `SELECT ingredient_a AS "ingredientA", ingredient_b AS "ingredientB", severity, summary, explanation, source
         FROM interactions
         WHERE ingredient_a = ANY($1::int[]) AND ingredient_b = ANY($1::int[])`,
        [ingredientIds]
      );

      scopedRules = {
        brandCatalog: { brandsById, brandsByName: new Map(), synonyms: new Map(), ingredientsById: new Map() },
        ingredientClassesMap: new Map(),
        scopedInteractions: interRes.rows,
        scopedTimingRules: [],
        scopedBeersRules: [],
        scopedContraindications: [],
        scopedFoodRules: [],
        scopedDoseLimits: [],
      };
    }

    const birthYear = patient.dob ? new Date(patient.dob).getFullYear() : null;
    const age = birthYear ? new Date().getFullYear() - birthYear : 50;
    const safetyReport = runAllChecks(
      { age, allergies: patient.allergies, conditions: patient.conditions },
      confirmedMeds,
      scopedRules,
      []
    );

    // 4. Stream PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="MedGuard-Report-${patient.name.replace(/\s+/g, '_')}.pdf"`);

    generateDoctorPdfReport(patient, activeMeds, safetyReport, res);
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient profile not found.' },
      });
    }
    next(err);
  }
});

