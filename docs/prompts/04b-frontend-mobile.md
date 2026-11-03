# Prompt 04b: Frontend agent, MOBILE phase
**When to use:** Only after the desktop phase (04a) is reviewed, tested and committed.

```
AGENT: Frontend (mobile phase)
Read /AGENTS.md, /docs/PRD.md and /docs/design/DESIGN.md.

DESIGN SOURCES
- Mobile screens: /docs/design/stitch-export/mobile/*/screen.png and code.html
- The existing desktop app in /client (already built and approved)
code.html files are visual references only.

SCOPE OF THIS PHASE: make the existing app work beautifully on phones (360-430px) and
tablets (768px). Do NOT rewrite the desktop screens or components. Reuse them and adapt
them. Do not create a separate mobile app.

Own only /client (except /client/src/ocr). Do not edit /server or /db.

TASKS (show me a short plan first and wait for approval):
1. Audit: open every screen at 390px and 768px and list what breaks (overflow, tiny text,
   sidebar, tables, two-column layouts). Show me the list before changing anything.
2. Navigation: below the laptop breakpoint, replace the sidebar with the bottom navigation
   bar from the mobile design (Home, Scan, Schedule, Settings) and a compact top bar with
   the language switcher and text-size toggle. Reuse the same routes.
3. Layouts: collapse two-column layouts to a single vertical column (the design system says
   critical medication results are strictly vertical, no side-by-side pinched cards).
   Use Tailwind breakpoints (sm, md, lg, xl) or max-width variants. Content on tablets can
   be capped around 600-720px.
4. Touch: minimum 48px tap targets with at least 12px between them, no hover-only
   interactions, bottom sheets for language and filters where the mobile design shows them.
5. Scan screen (mobile): camera view with a guide frame, torch/flash if available, gallery
   upload, barcode toggle placeholder, and the "Your photos stay on this phone" banner.
   Leave OCR itself to the OCR agent; just expose a clean hook (onImageSelected).
6. Match every mobile screen to its screenshot: Welcome/Login, Home, Patient detail, Scan,
   Confirm medicines, Safety report, Patient profile, Schedule, Emergency card, Settings.
7. Make it a PWA: web app manifest, icons, service worker with offline caching of the app
   shell, installable on Android. Do not cache patient data in the service worker.
8. Do not block pinch-zoom. Large-text mode must not truncate content on small screens.
9. Use the browser (mobile emulation) to screenshot every screen at 390px and 768px,
   compare with the mobile designs, list differences and fix them. Re-check desktop at
   1440px to make sure nothing regressed.

DESIGN OVERRIDES: same as the desktop phase (never "safe", no fake verification claims, no
external images, text follows the language switcher).

DONE WHEN: all screens work at 390px, 768px and 1440px, the app is installable as a PWA,
and your summary includes screenshots at all three widths.
Finish with the summary format from AGENTS.md section 7.
```
