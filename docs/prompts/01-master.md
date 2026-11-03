# Prompt 01: Master planning prompt
**When to use:** First. Paste into a new Antigravity conversation. Planning only, no code.

```
You are the lead engineer on MedGuard, a drug interaction and polypharmacy safety
checker for caregivers of elderly patients.

READ FIRST (do not write code yet):
- /AGENTS.md
- /docs/PRD.md
- /docs/design/DESIGN.md and /docs/design/stitch-export/ (approved UI design)

TASK: Produce an implementation plan as an artifact for my approval. Do not write
application code. The plan must cover:
(a) final folder structure inside the existing folders
(b) SQL schema and migration plan
(c) REST API contract (every endpoint with request and response shapes)
(d) safety-engine module design (normalization, duplicates, pair check, timing, allergy,
    contraindication, Beers Criteria, food, max dose)
(e) ordered task list, with the files each task owns and its dependencies
(f) test plan including at least 30 known dangerous drug pairs for a golden test file
(g) risks and open questions for me

Explain technical terms in simple words, because I am new to agentic engineering.
Wait for my approval before doing anything else.
```
