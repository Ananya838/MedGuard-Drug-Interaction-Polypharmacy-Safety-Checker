# MedGuard: Product Requirements Document (PRD)

## 1. Overview
MedGuard helps caregivers of elderly and chronically ill patients check whether the
medicines a patient takes are safe together. The caregiver photographs medicine strips
(or searches by name). MedGuard identifies the active ingredients, checks all combinations
against a locally cached interaction database, and produces a plain-language safety
report.

**Pitch:** A pharmacist-grade safety check in 30 seconds.

## 2. Problem
Patients often see multiple independent doctors who cannot see each other's prescriptions.
This causes:
- Drug-drug interactions (for example warfarin + aspirin raises bleeding risk)
- Duplicate therapy (Crocin and Dolo are both paracetamol)
- Timing conflicts (for example antacids reducing antibiotic absorption)
- Drugs unsuitable for age or conditions (for example NSAIDs in kidney disease)

Caregivers are usually non-medical family members who cannot judge these risks.

## 3. Users
- **Primary:** family caregiver, age 30-70, average Android phone, limited medical
  knowledge, often stressed. Mostly India; English plus regional languages.
- **Secondary:** elderly patient (reads reports, hears reminders), doctor/pharmacist
  (reads shared report), nurse or home helper.

## 4. Goals and non-goals
**Goals**
- Detect interactions, duplicates, timing conflicts and age/condition risks
- Explain results in plain language with clear next actions
- Work reliably for Indian brand medicines
- Protect privacy of health data

**Non-goals (v1)**
- No diagnosis or treatment advice
- No prescribing or dose changes
- No pharmacy ordering or payments
- No claim that any combination is "safe"

## 5. Scope by phase
| Phase | Scope |
|---|---|
| MVP | Auth, manual medicine search, brand to ingredient normalization, pair interaction check, duplicate detection, severity report, saved patient medicine list |
| P2 | OCR scanning, fuzzy matching, confirm-and-edit screen, patient profiles (age, allergies, conditions) |
| P3 | Allergy and contraindication checks, Beers Criteria, timing rules, doctor-ready PDF report |
| P4 | Reminders, schedule builder, adherence tracking, refill alerts |
| P5 | Multilingual, voice output, PWA offline mode, barcode scanning, large-text mode |
| P6 | LLM-worded explanations, chat assistant, share links, emergency card, admin dashboard |

## 6. Core user flow
1. Caregiver logs in and selects or creates a patient profile.
2. Adds medicines by scanning strips, scanning a barcode, or searching by name.
3. **Confirm screen:** reviews detected medicines (with confidence), edits or removes,
   adds missing ones.
4. Taps "Check safety".
5. Sees the report: traffic-light summary, findings sorted by severity, duplicates,
   timing advice, "what to do" for each.
6. Downloads a doctor-ready PDF, shares, sets reminders.

## 7. Functional requirements
**Accounts**
- FR-1 Register, login, logout, refresh token, delete account and all data.

**Patients**
- FR-2 A caregiver can manage multiple patient profiles.
- FR-3 Profile fields: name, date of birth, weight, allergies, conditions.

**Medicine entry**
- FR-4 Search medicines by brand or generic name with autocomplete.
- FR-5 OCR scan of strip photos in the browser; fuzzy match to known medicines.
- FR-6 Confirm screen is mandatory before any check; shows confidence per item.
- FR-7 Unrecognized items are shown in a clear "Could not identify" list.

**Normalization**
- FR-8 Map brand to active ingredient(s) and strengths using the local table first, then
  RxNorm.
- FR-9 Combination products map to several ingredients (for example Pan-D =
  pantoprazole + domperidone).

**Safety engine** (see section 8)
- FR-10 Pairwise interactions with severity and explanation.
- FR-11 Duplicate ingredient and duplicate class detection.
- FR-12 Timing and spacing rules.
- FR-13 Allergy checks by ingredient and drug class.
- FR-14 Disease-drug contraindications.
- FR-15 Beers Criteria for patients 65+.
- FR-16 Food and alcohol interactions.
- FR-17 Maximum daily dose check (for example total paracetamol).

**Reports**
- FR-18 Report with traffic-light summary, finding cards, "what to do", disclaimer.
- FR-19 Doctor-ready one-page PDF.
- FR-20 Read-aloud and multilingual support (later phases).

**Management (later phases)**
- FR-21 Reminders, schedule builder, adherence log, refill alerts.
- FR-22 Share link with expiry; emergency card.

## 8. Safety engine specification
The engine is deterministic. Input: list of confirmed medicines plus the patient profile.
Output: a structured list of findings.

**Order of checks:** normalize, then duplicates, then pair interactions, then timing, then
allergies, then contraindications, then Beers, then food/alcohol, then max dose.

**Finding format**
```json
{
  "type": "interaction | duplicate | timing | allergy | contraindication | beers | food | dose",
  "severity": "major | moderate | minor | info",
  "items": ["ingredient or brand A", "ingredient or brand B"],
  "summary": "plain-language one sentence",
  "explanation": "plain-language detail",
  "action": "what the caregiver should do",
  "source": "dataset name and version"
}
```

**Severity meaning**
- **Major (red):** contact the doctor or pharmacist today; do not change medicines alone.
- **Moderate (orange):** discuss with the doctor at the next opportunity.
- **Minor (yellow):** be aware; monitor.
- **No known interaction:** only "No known interaction found in our data."

## 9. Data model
```
users(id, name, email, password_hash, language, created_at)
patients(id, caregiver_id, name, dob, weight, allergies[], conditions[])
caregiver_access(id, patient_id, user_id, role, expires_at)
brands(id, brand_name, manufacturer, strength, form)
ingredients(id, name, rxcui, drug_class)
brand_ingredients(brand_id, ingredient_id, strength)
interactions(id, ingredient_a, ingredient_b, severity, description, source)  -- store A<B sorted
food_interactions(id, ingredient_id, item, severity, description)
contraindications(id, ingredient_id, condition, severity, description)
beers_rules(id, ingredient_id, rationale, recommendation)
patient_medicines(id, patient_id, brand_id, dose, frequency, start_date, end_date)
scan_history(id, patient_id, matched_drugs, confidence, created_at)   -- no images stored
reminders(id, patient_medicine_id, time, status)
adherence_log(id, reminder_id, status, logged_at)
audit_log(id, user_id, action, created_at)
```
Index `interactions(ingredient_a, ingredient_b)`. Use row-level security so each caregiver
sees only their own patients.

## 10. API summary
```
POST /api/auth/register | /login | /refresh
GET  /api/medicines/search?q=
POST /api/medicines/normalize
POST /api/check                    (confirmed medicines + patient id -> report)
GET/POST /api/patients
GET/POST /api/patients/:id/medicines
GET  /api/patients/:id/report.pdf
POST /api/reminders
POST /api/share/:patientId
```
The API agent will produce a full contract (request and response shapes) for approval
before implementing.

## 11. Non-functional requirements
- **Privacy:** photos processed on device; no health data in logs; delete-my-data option.
- **Accessibility:** body text at least 18px, tap targets at least 48px, WCAG AA contrast,
  severity never by color alone, large-text mode.
- **Performance:** report in under 3 seconds for 15 medicines on a mid-range phone;
  usable on slow mobile networks.
- **Reliability:** engine has no external calls at check time (uses cached data).
- **Languages:** English first; Hindi, Kannada, Tamil, Telugu later.

## 12. Acceptance criteria and golden tests
- All **golden dangerous pairs** must be flagged at the expected severity (the test file
  is stored in `server/engine/tests/golden-pairs.json`).
- Duplicate brands with the same ingredient must be flagged (for example Crocin + Dolo 650).
- Combination products must expand to all ingredients (Pan-D).
- Unrecognized medicines must never be silently dropped.
- OCR: report accuracy on at least 50 real strips, before and after pre-processing.
- A pharmacist or doctor reviews a sample of the engine output.

**Starter examples for the golden set (must be verified against DDInter and by a
pharmacist; do not treat this list as authoritative):**
| Pair | Concern |
|---|---|
| Warfarin + aspirin | Increased bleeding risk |
| Sildenafil + nitroglycerin | Dangerous drop in blood pressure |
| SSRI + MAO inhibitor | Serotonin syndrome |
| ACE inhibitor + potassium-sparing diuretic | High potassium |
| Methotrexate + trimethoprim | Serious blood toxicity |
| Lithium + NSAID | Raised lithium levels |
| Tramadol + SSRI | Seizure and serotonin risk |
| Clopidogrel + omeprazole | Reduced clopidogrel effect |

Duplicate and combination tests: Crocin + Dolo 650 (both paracetamol); Pan-D expands to
pantoprazole + domperidone.

## 13. Risks
| Risk | Mitigation |
|---|---|
| OCR errors on foil strips | Pre-processing, guide frame, confirm screen, barcode fallback |
| Indian brands missing from RxNorm | Local brand table is primary |
| Incomplete or outdated datasets | Show source and date; refresh regularly; careful wording |
| Over-reliance on the app | Disclaimers; "talk to your doctor" on every major finding |
| Dataset licence limits (non-commercial terms) | Check each licence before any commercial use |

## 14. Disclaimer text (use exactly in app and PDF)
MedGuard is an informational screening tool. It does not provide medical advice,
diagnosis or treatment, and it does not replace consultation with a doctor or pharmacist.
Never start, stop or change a medicine without professional guidance.

## 15. Glossary
- **Active ingredient:** the chemical that does the work in a medicine.
- **Polypharmacy:** taking many medicines at once.
- **Beers Criteria:** list of medicines risky for people over 65.
- **Golden test:** a fixed test case with a known correct answer.
- **Normalization:** converting brand names into standard ingredient names.
