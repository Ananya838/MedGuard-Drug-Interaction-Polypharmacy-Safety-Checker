# MedGuard — Caregiver Polypharmacy Safety & Medication Screening Aid

**MedGuard** is a web application built for family caregivers managing complex daily medication regimens for elderly dependents. It combines **on-device blister-strip OCR scanning** with a **100% deterministic polypharmacy safety engine** to flag potential drug interactions, duplicate active ingredients, drug-class allergies, condition contraindications, geriatric Beers Criteria risks, timing spacing issues, food conflicts, and age-adjusted daily dose limits.

> **Important Clinical & Data Notice**
>
> MedGuard is an informational screening tool. It **does not** provide medical advice, diagnosis, or treatment, and does not replace consultation with a doctor or pharmacist. Never start, stop, or change a medicine without professional guidance.
>
> Unless you import an external clinical dataset, the default seeded catalog and interaction rules represent **`MedGuard sample data (not clinically verified)`**. When no conflicts match in the database, MedGuard reports **`"No known interaction found in our data."`** and never labels a medication combination as "safe."

---

## Key Features

### 1. Deterministic 9-Check Safety Engine (`server/engine/`)
All clinical screening executes deterministically with zero LLM decision-making or network/database calls inside the engine itself:
1. **Normalization (`normalizer.js`)**: Expands commercial Indian brand names, combination products (e.g., *Ibuprofen + Paracetamol*), and generic synonyms (`ingredient_synonyms`), while preserving unrecognized items cleanly so nothing is silently dropped.
2. **Duplicate Therapy Detection (`duplicateChecker.js`)**: Flags identical active ingredients and overlapping pharmacological classes across a patient's medicines.
3. **Pairwise Drug–Drug Interactions (`interactionChecker.js`)**: Canonical ingredient-pair lookup (`ingredient_a < ingredient_b`) graded by source severity (`major`, `moderate`, `minor`, `info`).
4. **Administration Timing Conflicts (`timingChecker.js`)**: Checks minimum dose-spacing interval rules between co-administered ingredients.
5. **Allergy & Class Cross-Sensitivity (`allergyChecker.js`)**: Screens against recorded direct ingredient allergies and pharmacological drug classes (e.g., NSAIDs, Sulfa).
6. **Condition Contraindications (`contraindicationChecker.js`)**: Evaluates prescribed drugs against documented chronic condition codes (`CKD`, `HEART_FAILURE`, `ASTHMA`, `HYPERTENSION`, `PEPTIC_ULCER`, `DIABETES_T2`, `LIVER_DISEASE`, `EPILEPSY`, `GLAUCOMA`, `GOUT`).
7. **Geriatric Beers Criteria (`beersChecker.js`)**: Evaluates potentially inappropriate medications for elders aged **65 years or older**.
8. **Food & Dietary Interactions (`foodChecker.js`)**: Highlights conflicts with items such as grapefruit or alcohol.
9. **Age-Adjusted Daily Dose Limits (`doseChecker.js`)**: Evaluates cumulative daily ingredient totals against age-adjusted limits, while explicitly marking PRN (*as-needed*) entries as unable to calculate a fixed daily total.

Every finding uses fixed, human-authored severity action templates (`constants.js`) directing caregivers to consult a physician or pharmacist without altering prescribed dosages on their own.

---

### 2. Privacy-First On-Device Strip Scanner (`client/src/ocr/`)
* **Local Web Worker Execution**: Runs **Tesseract.js** locally inside the browser using self-hosted WASM and traineddata assets in `client/public/tesseract/` — **zero medicine strip photos leave the user's device**.
* **Noise Filtering & Fuzzy Matching**: Cleans image contrast (`imagePreprocessor.js`), removes packaging/watermark noise (`candidateExtractor.js`), matches candidates via **Fuse.js** (`fuzzyMatcher.js`), and confirms formulations against `/api/medicines/normalize`.
* **Confirm-Before-Check Guardrail**: Extracted names open in `ConfirmMedicinesPage.jsx` so a caregiver verifies brand IDs, dosages, and unrecognized items before executing `/api/check`.

---

### 3. Caregiver Suite & Accessibility
* **Multi-Elder Profiles**: Manage dependents with DOB, chronic conditions, documented allergies, and emergency contacts (`HomeDashboard.jsx`, `PatientDetailPage.jsx`).
* **Daily Medication Schedule (`SchedulePage.jsx`)**: Organizes regimens across **Morning**, **Afternoon**, **Evening**, and **Bedtime** intervals.
* **Doctor Handover PDF (`server/routes/pdfReport.js`)**: Streams a formatted clinical summary PDF via `GET /api/patients/:id/report.pdf` alongside a print-ready web view.
* **Elderly & Caregiver Accessibility**:
  * Bilingual English / Hindi toggle (`client/src/locales/en.js`, `hi.js`).
  * Adjustable font scaling (`A+` / `TextScaleContext.jsx`).
  * Browser **Read Aloud** speech synthesis (`window.speechSynthesis`) for safety reports.
  * Indian emergency shortcuts (`SOS 108/112` and Senior Citizen Helpline `14567`) plus a dedicated Emergency Medical Card view (`EmergencyCardPage.jsx`).

---

### 4. Security & Multi-Caregiver Isolation
* **JWT Session Management**: Short-lived access tokens and rotated/revocable refresh tokens stored hashed in PostgreSQL (`refresh_tokens`), paired with `bcryptjs` password hashing and Express rate limiting (`express-rate-limit`).
* **Defense-in-Depth Row-Level Security (RLS)**:
  * Primary scoping at the API query layer (`WHERE caregiver_id = $1`).
  * Secondary PostgreSQL RLS enforcement via transaction-local session context (`SET LOCAL` via `set_config('app.current_user_id', ...)`) inside `withUserTransaction` (`server/config.js`), executing under the non-superuser `medguard_app` role (`005_indexes_and_rls.sql`, `006_create_app_role.sql`).

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, React Router v6, Vite 6, Tailwind CSS v3, PostCSS, Noto Sans, Material Symbols Outlined |
| **On-Device OCR & Search** | Tesseract.js 7 (local WASM Web Worker), Fuse.js, browser Canvas preprocessing |
| **Backend API** | Node.js (ES Modules), Express 5, PDFKit, CORS, `express-rate-limit` |
| **Database** | PostgreSQL (via `pg` pool; compatible with Supabase PostgreSQL & RLS) |
| **Auth & Security** | `jsonwebtoken` (JWT access + refresh rotation), `bcryptjs` |
| **Testing** | Node.js built-in `node --test`, Vitest, React Testing Library, `jsdom` |

---

## Project Structure

```text
MedGaurd/
├── client/                         # React + Vite frontend
│   ├── public/tesseract/           # Self-hosted Tesseract WASM & English traineddata
│   └── src/
│       ├── api/                    # Fetch clients (auth, patients, medicines, check, schedule)
│       ├── components/             # Layout shell & UI primitives (FindingCard, DoseLimitBar, etc.)
│       ├── context/                # I18nContext (en/hi) & TextScaleContext
│       ├── locales/                # English & Hindi translations
│       ├── mocks/                  # Local fallback/sample mock catalog & test fixtures
│       ├── ocr/                    # On-device Tesseract worker, preprocessor, candidate extractor, Fuse matcher
│       ├── pages/                  # HomeDashboard, Patients, ScanStrips, ConfirmMedicines, SafetyReport, Schedule, EmergencyCard
│       └── __tests__/              # Vitest component tests, OCR tests & integration E2E tests
├── db/
│   ├── migrations/                 # Sequential PostgreSQL migrations (001–006 including RLS & medguard_app role)
│   ├── seeds/                      # Starter sample ingredients, Indian brands & safety rules JSON
│   └── dbClient.js                 # Database pool helper with RLS transaction wrapper
├── scripts/
│   ├── migrate.js                  # Runs sequential SQL migrations (uses MIGRATION_DATABASE_URL)
│   ├── seed.js                     # Seeds sample ingredients, brands & starter pairs
│   ├── verify-db.js                # Verifies required tables, row counts, and RLS status
│   ├── expand-catalog.js           # Expands Indian commercial brand & formulation mappings
│   ├── import-ddinter.js           # CSV importer for DDInter-format drug interaction datasets
│   ├── import-indian-brands.js     # CSV importer for Indian medicine brand datasets
│   ├── setup-demo-showcase.js      # Seeds showcase elder profiles (Ram & Savitri Devi) for demos
│   ├── benchmark-latency.js        # Measures API & engine endpoint latencies
│   └── tests/                      # Unit tests for CSV & brand importers
├── server/
│   ├── auth/                       # JWT signing/verification & authService
│   ├── engine/                     # Pure deterministic 9-check safety engine + unit tests
│   ├── middleware/                 # JWT authenticate, global errorHandler, rateLimiter
│   ├── routes/                     # Express routers (/auth, /patients, /medicines, /check, pdfReport)
│   ├── tests/                      # API & auth integration tests
│   ├── app.js                      # Express app setup
│   └── server.js                   # HTTP server entrypoint
├── test-assets/                    # Synthetic & test medicine strip images for OCR evaluation
└── package.json                    # Root scripts & backend dependencies
```

---

## Local Setup & Running

### Prerequisites
* **Node.js 18+** (uses ES Modules and built-in `node --test` runner)
* **PostgreSQL 14+** (local instance or hosted Supabase PostgreSQL)

### 1. Install Dependencies
```bash
# Install root/backend dependencies
npm install

# Install frontend dependencies
npm install --prefix client
```

### 2. Configure Environment Variables
Create `.env` (or `server/.env`) using [`server/.env.example`](server/.env.example) and [`db/.env.example`](db/.env.example) as templates:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173

# Migration connection (table owner / superuser role for running DDL migrations)
MIGRATION_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/medguard

# Application runtime connection (non-owner role 'medguard_app' for RLS enforcement)
DATABASE_URL=postgresql://medguard_app:YOUR_APP_PASSWORD@localhost:5432/medguard

# JWT Secrets (32+ random characters)
JWT_ACCESS_SECRET=replace_with_a_secure_random_32_character_string_for_access
JWT_REFRESH_SECRET=replace_with_a_secure_random_32_character_string_for_refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Run Database Migrations, Seed & Verification
```bash
# Apply SQL migrations (001 through 006)
npm run migrate

# Seed starter sample ingredients, Indian brands, and safety rules
npm run seed

# Verify all 21 tables and RLS configuration
npm run verify-db
```

### 4. Start the Application
Open two terminals:

```bash
# Terminal 1 — Start Express API server (http://localhost:5000)
npm start
```

```bash
# Terminal 2 — Start React Vite dev server (http://localhost:5173)
npm run dev --prefix client
```

---

## Available Scripts & Testing

### Backend & Safety Engine
```bash
npm test                # Run all engine, importer, and API tests
npm run test:engine     # Run deterministic safety engine unit tests only
npm run test:importers  # Run CSV dataset importer unit tests
npm run test:server     # Run Express API route & auth tests
```

### Frontend & Production Build
```bash
npm test --prefix client     # Run Vitest unit, OCR & desktop E2E integration tests
npm run build --prefix client
npm run preview --prefix client
```

### Utility & Demo Scripts
* `node scripts/expand-catalog.js` — Seeds additional Indian commercial brand formulations from `db/seeds/expanded_indian_brands.json`.
* `node scripts/setup-demo-showcase.js` — Configures demo elder profiles (`Ram` and `Savitri Devi`) under caregiver `alex@example.com` (if that user exists in `users`).
* `node scripts/benchmark-latency.js` — Benchmarks search, normalization, patient fetch, safety check, and PDF generation endpoints.
* `node scripts/import-ddinter.js <csv-paths...>` & `node scripts/import-indian-brands.js <csv>` — Import external interaction and Indian commercial brand CSV datasets.

---

## Core API Endpoints

| Group | Endpoints | Description |
|---|---|---|
| **Health** | `GET /api/health` | Service health check |
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `DELETE /api/auth/account` | Caregiver authentication, token rotation & account removal |
| **Patients** | `GET /api/patients`, `POST /api/patients`, `GET /api/patients/:id`, `PUT /api/patients/:id`, `DELETE /api/patients/:id` | Scoped caregiver patient CRUD |
| **Regimens & PDF** | `GET /api/patients/:id/medicines`, `POST /api/patients/:id/medicines`, `DELETE /api/patients/:id/medicines/:medId`, `GET /api/patients/:id/report.pdf` | Manage active patient medicines & stream clinical PDF summary |
| **Medicines** | `GET /api/medicines/search?q=...`, `POST /api/medicines/normalize` | Cached brand/ingredient autocomplete & OCR candidate normalization |
| **Safety Check** | `POST /api/check` | Executes the 9-check deterministic engine on confirmed `brandId` entries & unrecognized items |

---

## Disclaimer

> MedGuard is intended strictly as an **informational polypharmacy screening aid** for caregivers and families. It must never be relied upon as a standalone clinical decision system. Always consult a qualified physician or pharmacist before starting, stopping, splitting, or adjusting any medication.

