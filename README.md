# MedGuard
Drug interaction and polypharmacy safety checker for caregivers.

## Folder guide
- `AGENTS.md` : rules every AI agent must follow
- `docs/PRD.md` : product requirements
- `docs/design/` : Stitch design export (DESIGN.md and screens)
- `docs/prompts/` : prompts to paste into Antigravity, in numbered order
- `client/` : React frontend
- `server/` : Express API and safety engine
- `db/` and `scripts/` : database schema and data imports
- `test-assets/` : sample strip photos for OCR testing

## Order of work
1. Prompt 01 (plan) 2. Prompt 02 (engine) 3. Prompt 03 (API) 4. Prompt 04a (frontend, DESKTOP)
5. Prompt 06 (integration, desktop) 6. Prompt 05 (OCR) 7. Prompt 04b (frontend, MOBILE + PWA)
Review and commit after each one. Desktop is built and finished before mobile.