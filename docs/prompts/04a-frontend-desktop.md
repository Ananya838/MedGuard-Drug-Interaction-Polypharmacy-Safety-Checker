# Prompt 04a: Frontend agent, DESKTOP first
**When to use:** After the design export is in /docs/design. Can run alongside the Engine
agent because it uses mocked data. Build and review desktop completely before mobile.

```
AGENT: Frontend (desktop phase)
Read /AGENTS.md, /docs/PRD.md and /docs/design/DESIGN.md.

DESIGN SOURCES
- Design system: /docs/design/DESIGN.md
- Desktop screens: /docs/design/stitch-export/desktop/*/screen.png and code.html
- Mobile screens (for reference only in this phase): /docs/design/stitch-export/mobile/
The code.html files are visual references only. Rebuild everything as React components.
Do not copy their Tailwind CDN script, hard-coded text, or fake data.

SCOPE OF THIS PHASE: laptop and desktop screens only (1280px to 1920px wide).
Do NOT build mobile layouts yet. Do not add a bottom navigation bar.

Own only /client (except /client/src/ocr). Do not edit /server or /db.

TASKS (show me a short plan first and wait for approval):
1. Set up React + Vite + Tailwind + React Router. Convert the design tokens (colors,
   typography, spacing, radii, severity colors) into the Tailwind config. Do not invent new
   colors or fonts. Load Noto Sans and one icon set (Material Symbols).
2. Build the desktop app shell: left sidebar (Home, Patients, Scan Strips, Schedule,
   Settings), top bar (search, language switcher, text-size toggle, profile menu), and a
   content area with max-width around 1200-1400px.
3. Build reusable components first: Button, Card, Chip, Input, SeverityBadge, FindingCard,
   Sidebar, TopBar, DisclaimerFooter, EmptyState, LoadingState, DoseLimitBar.
4. Build screens one at a time, in this order, matching the desktop screenshots:
   Home dashboard, Patient detail, Confirm medicines, Safety report, Schedule, Settings.
   Then adapt the screens that have no desktop design, using the mobile design plus the
   same shell and two-column rules: Login/Register, Patient profile form, Emergency card,
   and Scan (on desktop use drag-and-drop upload and optional webcam capture, with the same
   "photos stay on this device" privacy banner).
5. Create the API client layer in /client/src/api with MOCKED responses from
   /client/src/mocks (including mock schedule data; the reminders backend is deferred). Keep
   all API calls in that one layer, using the request and response shapes from /docs/PLAN.md,
   so the Integration agent can later switch it to the real API. The check call sends
   confirmed brand IDs plus an unrecognized list only.
6. Build mobile-READY, not mobile-DESIGNED: use flex and grid, relative units (rem, %),
   min/max widths and no hard-coded pixel widths for layout, so the next phase can add
   mobile layouts without rewrites. Put the sidebar and top bar in separate components so
   they can be swapped for a bottom bar later.
7. Accessibility: body text at least 18px, click targets at least 48px, severity shown with
   icon + label + text (never color alone), visible keyboard focus, full keyboard
   navigation, large-text mode that scales text without breaking layouts. Do not block
   pinch-zoom or browser zoom.
8. Print styles: the Safety report must print cleanly on one or two A4 pages
   (hide sidebar and top bar), because doctors will print it.
9. Write component and screen tests (Vitest + React Testing Library) for Button,
   SeverityBadge, FindingCard and the Confirm medicines screen, in /client/src/__tests__.
10. Use the browser to open the app at 1440px width, screenshot every screen, compare it with
   the matching desktop screenshot, list the differences and fix them. Also check at 1280px
   and 1920px.

DESIGN OVERRIDES (these win over the mock-ups)
- Colors: use the values from the screens' Tailwind config. Tell me about any mismatch with
  DESIGN.md instead of silently choosing.
- Never use the word "safe". Use "No known interaction found in our data."
- Remove every "verified by", "clinical desk" or similar claim, and fake doctor or hospital
  names. Use clearly fictional sample data.
- Replace external image links with initials avatars or icons.
- All text must follow the language switcher. Do not show English and Hindi together.
  Put strings in a translations file (English first, Hindi stub) from the start.

DONE WHEN: the app runs with one command, every desktop screen matches the design at
1440px, and your summary includes screenshots and remaining differences.
Finish with the summary format from AGENTS.md section 7.
```