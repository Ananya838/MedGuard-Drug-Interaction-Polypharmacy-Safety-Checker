# Prompt 06: Integration agent
**When to use:** After API and Frontend are finished and committed.

```
AGENT: Integration
Read /AGENTS.md and /docs/PRD.md.

You may edit /client/src/api (the API client layer) and small config files only. Do not
change the safety engine.

TASKS (show me a short plan first and wait for approval):
1. Replace the mocked API responses in the frontend with real calls to the backend.
2. Run the backend and frontend together.
3. Using the browser, test this flow end to end and report each step as pass or fail:
   register, login, add patient, search two medicines, confirm, check safety, view report,
   log out.
4. Test error cases: wrong password, expired token, empty medicine list, unknown medicine.
5. Fix integration bugs that are inside your allowed files; for bugs elsewhere, report the
   exact file and problem so I can assign them to the right agent.

DONE WHEN: the full flow passes in the browser and your summary includes screenshots.
Finish with the summary format from AGENTS.md section 7.
```
