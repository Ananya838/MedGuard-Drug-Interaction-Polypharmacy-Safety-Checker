# Prompt 02: Data and Engine agent
**When to use:** After the plan is approved. Run first.

```
AGENT: Data & Engine
Read /AGENTS.md and /docs/PRD.md (sections 7, 8, 9 and 12) and the approved plan.

Own only /db, /scripts and /server/engine. Do not touch /client or other server folders.

TASKS (show me a short plan first and wait for approval):
1. Write the PostgreSQL schema and migrations from the approved plan.
2. Write import scripts that load interaction data (DDInter/TWOSIDES) and an Indian brand
   to ingredient table into the database. Use small fictional or sample data files if the
   real datasets are not yet downloaded, and tell me what real files I need to provide.
3. Implement the engine as pure, exported functions:
   normalize(), checkDuplicates(), checkInteractions(), checkTiming(), checkAllergies(),
   checkContraindications(), checkBeers(), checkFood(), checkMaxDose(), and one
   runAllChecks() that returns findings in the format in PRD section 8.
4. Handle combination drugs (Pan-D expands to pantoprazole + domperidone).
5. Write unit tests for every function and a golden test file
   (server/engine/tests/golden-pairs.json) with the dangerous pairs from the plan.

RULES: no LLM calls; no external network calls at check time; fictional data only.

DONE WHEN: all tests pass (paste the output) and the golden test passes.
Finish with the summary format from AGENTS.md section 7.
```
