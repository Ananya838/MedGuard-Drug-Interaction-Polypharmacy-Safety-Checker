# AGENTS.md: Rules for every AI agent working on MedGuard

MedGuard is a drug interaction and polypharmacy safety checker for caregivers of elderly
patients. A wrong answer here can harm a real person, so correctness and honesty matter
more than speed or cleverness.

## 1. Read first (before every task)
1. `docs/PRD.md` : what we are building and why
2. `docs/design/DESIGN.md` : colors, fonts, spacing, components (frontend work only)
3. This file

## 2. Tech stack (do not change without asking)
- Frontend: React (Vite) + Tailwind CSS, installable PWA
- Backend: Node.js + Express
- Database: PostgreSQL (hosted on Supabase)
- Auth: JWT (access + refresh tokens), bcrypt/argon2 password hashing
- OCR: Tesseract.js running in a browser Web Worker
- Fuzzy matching: Fuse.js
- Drug normalization: local Indian brand table first, RxNorm API as fallback
- Interaction data: DDInter / TWOSIDES imported into Postgres (cached locally)
- Tests: Vitest or Jest (backend and engine), React Testing Library (frontend)

## 3. Folder ownership (only edit your own folders)
| Folder | Owner | Purpose |
|---|---|---|
| `/db`, `/scripts`, `/server/engine` | Engine agent | Schema, imports, safety checks |
| `/server/routes`, `/server/middleware`, `/server/auth` | API agent | REST API, auth, validation |
| `/client` (except `/client/src/ocr`) | Frontend agent | UI |
| `/client/src/ocr` | OCR agent | Image pre-processing, OCR, matching |
| `/docs`, `AGENTS.md` | Human only | Do not edit unless asked |

If a task needs a change outside your folders, STOP and tell the human what is needed.

## 4. Non-negotiable safety rules
1. **Deterministic detection.** Whether drugs interact is decided only by database rules
   and data. Never use an LLM to decide, guess or fill in interaction data.
2. **LLMs may only reword** explanations that the engine already produced.
3. **Confirm before check.** OCR output must go through the user confirm screen. Never run
   a safety check on unconfirmed OCR text.
4. **Never say "safe".** If nothing is found, say "No known interaction found in our data."
5. **Show uncertainty.** Unrecognized medicines must be listed clearly, never skipped
   silently.
6. **Always show the disclaimer** on report screens and PDFs: MedGuard is a screening aid
   and does not replace a doctor or pharmacist.
7. **Severity must be explained** with icon + label + text, never color alone.

## 5. Privacy and security rules
- Photos are processed on the device. Never upload, log or store images by default.
- Never log patient names, medicines or health data to the console or log files.
- Use only fictional patient data in tests, seeds and examples.
- No secrets in code. Use `.env` (and keep `.env` in `.gitignore`). Provide `.env.example`.
- Validate and sanitize all inputs. Use parameterized SQL queries only.
- Rate-limit auth and check endpoints. Every patient query must be scoped to the
  logged-in caregiver.

## 6. Coding conventions
- JavaScript (ES modules). Small functions, clear names, comments where logic is not obvious.
- Safety-engine functions are pure (same input gives same output) and fully unit-tested.
- Every function you add needs a test. Run all tests before saying you are done.
- No new dependencies without saying why in your summary.
- Keep files short; split when a file passes about 300 lines.

## 7. Working method
1. **Plan first.** Show a short implementation plan and wait for human approval.
2. **Small steps.** Do exactly the task given. Do not add extra features.
3. **Verify.** Run tests and the app. Report real results, not assumptions.
4. **Summarize.** End with: what you built, files changed, how to run it, tests run
   and results, known limitations, and what the human should check manually.
5. If something is unclear, ask a question instead of guessing.

## 8. Definition of done
- Code runs without errors
- All tests pass (paste the test output in your summary)
- Only files in your own folders were changed
- No secrets, no patient data, no console logs of health data
- Summary delivered in the format in section 7

## 9. Design rules (frontend)
- Build order: DESKTOP first (1280px+), then mobile (360-430px) and tablet (768px).
- Design files: `docs/design/DESIGN.md`, `docs/design/stitch-export/desktop/`, `.../mobile/`.
  The `code.html` files are visual references only; rebuild as React components.
- Where the mock-ups conflict with sections 4 and 5 of this file, this file wins: never use
  the word "safe", no "verified by" or clinical-desk claims, no fake doctor or hospital names,
  no external image links, never block pinch-zoom.
- All user-visible text lives in a translations file and follows the language switcher.