# Prompt 03: API agent
**When to use:** After the Engine agent is finished, reviewed and committed.

```
AGENT: API
Read /AGENTS.md, /docs/PRD.md and /docs/PLAN.md (follow the approved API contract exactly).

Own only /server/routes, /server/middleware, /server/auth, /server/tests, /server/server.js,
/server/app.js, /server/config.js and /server/.env.example. Use the engine only through its
exported functions. Do not edit /server/engine, /db, /scripts or /client.

TASKS (show me a short plan first and wait for approval):
1. Express app structure, config validation from .env, and a .env.example file (no secrets).
2. Database access through a pg pool using DATABASE_URL. Every request that touches patient
   data must run inside a transaction that does `SET LOCAL app.current_user_id = ...`
   (connections are pooled, so never set it per connection). Use a non-owner database role.
3. Auth: register, login, refresh (rotation), logout, delete account, bcrypt hashing, JWT
   middleware, refresh_tokens table with hashed tokens and revocation.
4. Endpoints from PLAN.md: medicine search, normalize, check, patient CRUD, patient medicine
   CRUD, report PDF.
   - /api/check accepts confirmed BRAND IDs plus an `unrecognized` list ONLY. Raw or OCR text
     is accepted only by /api/medicines/normalize. The server resolves ingredients itself.
   - For each check request, load only the rules needed for the ingredients involved and pass
     them to the pure engine.
5. Primary protection: every patient query is scoped with WHERE caregiver_id = current user
   (or valid caregiver_access). RLS is only the second layer.
6. Input validation, rate limiting on auth and check, consistent error envelope, no health
   data in logs or error messages.
7. API tests for every endpoint, including unauthorized access, another caregiver's patient,
   invalid input, expired tokens, and raw strings sent to /api/check (must be rejected).

RULES: parameterized SQL only; never log health data; no secrets in code; never say "safe".

DONE WHEN: all tests pass (paste the output) and I can start the server with one command.
Include example curl commands for each endpoint in your summary.
Finish with the summary format from AGENTS.md section 7.
```