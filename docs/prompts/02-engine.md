# Prompt 02: Data and Engine agent
**When to use:** After the plan (docs/PLAN.md) is approved. Run first.

```
AGENT: Data & Engine
Read /AGENTS.md, /docs/PRD.md and /docs/PLAN.md (the approved plan: follow its schema and
engine design exactly).

Own only /db, /scripts and /server/engine. Do not touch /client or other server folders.

TASKS (show me a short plan first and wait for approval):
1. Write the PostgreSQL migrations 001-005 from PLAN.md: integer ingredient IDs with a < b
   for interactions and timing rules, refresh_tokens, drug_classes, ingredient_synonyms,
   dose_limits (age-adjusted), is_prn and structured dosing on patient_medicines, and
   controlled vocabularies for allergies and conditions. RLS second layer must use
   current_setting('app.current_user_id'), FORCE ROW LEVEL SECURITY, and consistent policies
   on every RLS table. Do not use auth.uid().
2. Seed data: a SMALL sample only (30-50 brands, a few dozen interactions and rules), clearly
   labeled source "MedGuard sample data (not clinically verified)". Seed files refer to
   ingredients by NAME; seed.js resolves the integer IDs. Do NOT invent clinical data beyond
   this small labeled sample, and never label it DDInter.
3. Importers: scripts/import-ddinter.js and scripts/import-indian-brands.js that read real
   files I will download (tell me exactly which files and which columns/format you expect).
   Both must use ingredient_synonyms so names such as acetaminophen and paracetamol map to
   one ingredient. Importers must report counts of matched, merged and skipped rows.
4. Engine as pure, exported functions: normalize(), checkDuplicates(), checkInteractions(),
   checkTiming(), checkAllergies(), checkContraindications(), checkBeers(), checkFood(),
   checkMaxDose(), and runAllChecks() returning findings in the PRD section 8 format.
   - The engine takes only the rules it needs as input. No database or network calls.
   - Severity comes from the data, never from code.
   - Caregiver "action" text comes from fixed severity templates in constants.js. It must never
     tell anyone to stop, change, switch, skip, halve, cap or dose a medicine; it tells them
     to contact the doctor or pharmacist.
   - PRN (as-needed) medicines: the dose check reports "cannot calculate daily total".
   - Combination products expand to all ingredients (Pan-D).
   - Unrecognized items are kept and reported, never dropped.
5. Tests:
   - Unit tests for every function.
   - server/engine/tests/starter-pairs.json: the unverified starter set from PLAN.md section 7.
   - Negative tests that use a small FIXED test dataset in which the pair is known to be
     absent. Do not assert that two real drugs have no interaction.
   - A synonym test (acetaminophen and paracetamol resolve to one ingredient).
   - Tests for duplicates, classes, combinations, Beers (age 74), PRN, and unrecognized items.

RULES: no LLM calls; no network calls at check time; fictional patient data only; never say
"safe" or "verified".

DONE WHEN: all tests pass (paste the output) and the migrations apply cleanly to an empty
database (paste the output of scripts/verify-db.js).
Finish with the summary format from AGENTS.md section 7, and list which real data files I
still need to provide.
```