/**
 * MedGuard Safety Engine Constants
 * 
 * Non-negotiable safety rules:
 * - Deterministic detection.
 * - Action text comes from fixed severity templates written by humans.
 * - Never tell anyone to stop, change, switch, skip, halve, cap or dose a medicine.
 * - Always tell them to contact or discuss with the doctor or pharmacist.
 * - Never use the word "safe". If zero interactions found: "No known interaction found in our data."
 */

export const SEVERITY_LEVELS = {
  MAJOR: 'major',
  MODERATE: 'moderate',
  MINOR: 'minor',
  INFO: 'info'
};

export const FINDING_TYPES = {
  INTERACTION: 'interaction',
  DUPLICATE: 'duplicate',
  TIMING: 'timing',
  ALLERGY: 'allergy',
  CONTRAINDICATION: 'contraindication',
  BEERS: 'beers',
  FOOD: 'food',
  DOSE: 'dose'
};

/**
 * Fixed severity-based caregiver action templates.
 * These templates must be used verbatim for all engine findings.
 */
export const ACTION_TEMPLATES = {
  major: "Contact the patient's doctor or pharmacist today before giving these medicines together. Do not alter prescribed doses without professional guidance.",
  moderate: "Discuss this combination with the patient's doctor or pharmacist at the next appointment. Monitor the patient for symptoms.",
  minor: "Be aware of this combination and monitor the patient. Mention it to the pharmacist during your next refill.",
  info: "No known interaction found in our data. Always verify all medicines with a doctor or pharmacist."
};

export const NO_INTERACTION_MESSAGE = "No known interaction found in our data.";

export const MANDATORY_DISCLAIMER = "MedGuard is an informational screening tool. It does not provide medical advice, diagnosis or treatment, and it does not replace consultation with a doctor or pharmacist. Never start, stop or change a medicine without professional guidance.";

/**
 * Controlled vocabularies for chronic conditions
 */
export const CONTROLLED_CONDITIONS = [
  'CKD',            // Chronic Kidney Disease
  'HEART_FAILURE',  // Congestive Heart Failure
  'ASTHMA',         // Bronchial Asthma / COPD
  'HYPERTENSION',   // High blood pressure
  'PEPTIC_ULCER',   // Active / history of gastric/duodenal ulcer
  'DIABETES_T2',    // Type 2 Diabetes Mellitus
  'LIVER_DISEASE',  // Hepatic impairment / cirrhosis
  'EPILEPSY',       // Seizure disorder
  'GLAUCOMA',       // Narrow-angle glaucoma
  'GOUT'            // Hyperuricemia / Gout
];

