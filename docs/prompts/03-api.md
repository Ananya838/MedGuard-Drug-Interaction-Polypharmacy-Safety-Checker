# Prompt 03: API agent
**When to use:** After the Engine agent is finished, reviewed and committed.

```
AGENT: API
Read /AGENTS.md, /docs/PRD.md (sections 7, 10, 11) and the approved API contract.

Own only /server/routes, /server/middleware and /server/auth. Use the engine only through
its exported functions. Do not edit /server/engine, /db or /client.

TASKS (show me a short plan first and wait for approval):
1. Set up the Express app structure, config from .env, and a .env.example file.
2. Implement auth: register, login, refresh, logout, password hashing, JWT middleware.
3. Implement endpoints from the approved contract: medicine search, normalize, check,
   patients, patient medicines.
4. Add input validation, rate limiting on auth and check, consistent error responses,
   and scoping so every patient query belongs to the logged-in caregiver.
5. Write API tests for each endpoint, including unauthorized and invalid-input cases.

RULES: parameterized SQL only; never log health data; no secrets in code.

DONE WHEN: all tests pass (paste the output) and I can run the server with one command.
Include example curl commands in your summary so I can try each endpoint.
Finish with the summary format from AGENTS.md section 7.
```
