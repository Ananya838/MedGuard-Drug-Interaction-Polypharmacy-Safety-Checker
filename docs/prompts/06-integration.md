# Prompt 06: Integration agent
**Used twice:** (A) after the desktop UI and API are finished (desktop integration), and
(B) at the very end, after OCR and the mobile phase (final integration).

## 06A: Desktop integration
```
AGENT: Integration (desktop)
Read /AGENTS.md, /docs/PRD.md and /docs/PLAN.md.

Own only /client/src/api and integration tests. Do not change the safety engine, the server
code, or page layouts. For bugs elsewhere, report the exact file and problem so I can assign
them to the right agent.

TASKS (show me a short plan first and wait for approval):
1. Switch /client/src/api from mocks to real calls to the backend (auth, patients, medicine
   search, normalize, check). Keep a simple flag so mocks can still be used for UI work.
2. Run the backend and frontend together against a test database.
3. Using the browser, test this flow end to end and report each step as pass or fail:
   register, login, add patient, search two medicines, confirm, check safety, view report,
   log out, delete account.
4. Test error cases: wrong password, expired token, empty medicine list, unknown medicine
   (must appear in the unrecognized list), another caregiver's patient (must be refused).
5. Confirm the report never says "safe" and always shows the disclaimer.

DONE WHEN: the full desktop flow passes and your summary includes screenshots.
Finish with the summary format from AGENTS.md section 7.
```

## 06B: Final integration (after OCR and mobile)
```
AGENT: Integration (final)
Read /AGENTS.md, /docs/PRD.md and /docs/PLAN.md.

Own only /client/src/api, integration tests, and the single hook that passes OCR results into
the Confirm medicines screen (ask me before touching any other page file).

TASKS (show me a short plan first and wait for approval):
1. Send OCR output (scanStrip results) to /api/medicines/normalize, then show it on the
   Confirm medicines screen. Nothing may reach /api/check without the user confirming.
2. Test the whole flow on desktop (1440px) and mobile (390px): scan or upload a strip, confirm,
   check, view report, print or download the PDF.
3. Test failure cases: blurry photo, no text found, low-confidence match, unknown medicine.
4. Report any remaining bugs with exact file names.

DONE WHEN: the full flow passes at both widths and your summary includes screenshots.
Finish with the summary format from AGENTS.md section 7.
```