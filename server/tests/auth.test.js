import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { app } from '../app.js';
import { setPool } from '../config.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from '../auth/jwt.js';

describe('Auth Module & Middleware Tests', () => {
  let server;
  let baseUrl;

  // In-memory test store simulating users and refresh_tokens tables
  let mockUsers = [];
  let mockRefreshTokens = [];

  const mockDbPool = {
    async query(sql, params = []) {
      const lowerSql = sql.toLowerCase().trim();

      // 1. SELECT id FROM users WHERE lower(email) = $1
      if (lowerSql.includes('from users') && lowerSql.includes('where lower(email) = $1')) {
        const found = mockUsers.filter((u) => u.email.toLowerCase() === params[0].toLowerCase());
        return { rows: found };
      }

      // 2. INSERT INTO users ... RETURNING id, name, email, language, created_at
      if (lowerSql.startsWith('insert into users')) {
        const newUser = {
          id: crypto.randomUUID(),
          name: params[0],
          email: params[1],
          password_hash: params[2],
          language: params[3] || 'en',
          created_at: new Date(),
        };
        mockUsers.push(newUser);
        return { rows: [newUser] };
      }

      // 3. SELECT id, name, email, password_hash, language FROM users WHERE lower(email) = $1
      if (lowerSql.includes('from users') && lowerSql.includes('where lower(email) = $1')) {
        const found = mockUsers.filter((u) => u.email.toLowerCase() === params[0].toLowerCase());
        return { rows: found };
      }

      // 4. SELECT id, name, email, language FROM users WHERE id = $1
      if (lowerSql.startsWith('select') && lowerSql.includes('from users') && lowerSql.includes('where id = $1')) {
        const found = mockUsers.filter((u) => u.id === params[0]);
        return { rows: found };
      }

      // 5. INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      if (lowerSql.startsWith('insert into refresh_tokens')) {
        const newToken = {
          id: crypto.randomUUID(),
          user_id: params[0],
          token_hash: params[1],
          expires_at: params[2],
          revoked: false,
        };
        mockRefreshTokens.push(newToken);
        return { rows: [newToken] };
      }

      // 6. SELECT id, user_id, revoked, expires_at FROM refresh_tokens WHERE token_hash = $1
      if (lowerSql.includes('from refresh_tokens') && lowerSql.includes('where token_hash = $1')) {
        const found = mockRefreshTokens.filter((t) => t.token_hash === params[0]);
        return { rows: found };
      }

      // 7. UPDATE refresh_tokens SET revoked = true WHERE id = $1
      if (lowerSql.startsWith('update refresh_tokens set revoked = true where id = $1')) {
        const token = mockRefreshTokens.find((t) => t.id === params[0]);
        if (token) token.revoked = true;
        return { rows: token ? [token] : [] };
      }

      // 8. UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1 AND user_id = $2
      if (lowerSql.includes('update refresh_tokens') && lowerSql.includes('token_hash = $1 and user_id = $2')) {
        const token = mockRefreshTokens.find(
          (t) => t.token_hash === params[0] && t.user_id === params[1]
        );
        if (token) token.revoked = true;
        return { rows: token ? [token] : [] };
      }

      // 9. DELETE FROM users WHERE id = $1 (cascading delete)
      if (lowerSql.startsWith('delete from users where id = $1')) {
        mockUsers = mockUsers.filter((u) => u.id !== params[0]);
        mockRefreshTokens = mockRefreshTokens.filter((t) => t.user_id !== params[0]);
        return { rows: [] };
      }

      return { rows: [] };
    },
  };

  before(async () => {
    // Inject mock pool into config
    setPool(mockDbPool);

    // Start HTTP server on ephemeral port for real HTTP testing
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    mockUsers = [];
    mockRefreshTokens = [];
  });

  // JWT Unit Tests
  test('JWT: signs, hashes and verifies access & refresh tokens', () => {
    const user = { id: 'usr-123', email: 'caregiver@example.com', name: 'Aarav Patel', language: 'en' };
    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);

    assert.ok(access, 'Access token should be non-empty');
    assert.ok(refresh, 'Refresh token should be non-empty');

    const decodedAccess = verifyAccessToken(access);
    assert.equal(decodedAccess.sub, 'usr-123');
    assert.equal(decodedAccess.email, 'caregiver@example.com');
    assert.equal(decodedAccess.name, 'Aarav Patel');

    const decodedRefresh = verifyRefreshToken(refresh);
    assert.equal(decodedRefresh.sub, 'usr-123');

    const hash1 = hashToken(refresh);
    const hash2 = hashToken(refresh);
    assert.equal(hash1, hash2, 'SHA-256 hash must be deterministic');
  });

  // Registration Endpoint Tests
  test('POST /api/auth/register: successfully registers a caregiver and returns tokens', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        password: 'StrongPassword123!',
        language: 'hi',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.name, 'Priya Sharma');
    assert.equal(body.data.user.email, 'priya.sharma@example.com');
    assert.equal(body.data.user.language, 'hi');
    assert.ok(body.data.tokens.accessToken);
    assert.ok(body.data.tokens.refreshToken);

    // Verify stored password is a secure bcrypt hash, not plaintext
    assert.equal(mockUsers.length, 1);
    assert.notEqual(mockUsers[0].password_hash, 'StrongPassword123!');
    assert.ok(mockUsers[0].password_hash.startsWith('$2'));

    // Verify refresh token is stored hashed in DB
    assert.equal(mockRefreshTokens.length, 1);
    assert.notEqual(mockRefreshTokens[0].token_hash, body.data.tokens.refreshToken);
  });

  test('POST /api/auth/register: rejects invalid input and duplicate email', async () => {
    // Missing name
    const res1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    assert.equal(res1.status, 400);
    const body1 = await res1.json();
    assert.equal(body1.error.code, 'VALIDATION_ERROR');

    // Short password (< 8 chars)
    const res2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User', email: 'test@example.com', password: '123' }),
    });
    assert.equal(res2.status, 400);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'VALIDATION_ERROR');

    // Seed a user, then attempt duplicate registration
    mockUsers.push({
      id: 'existing-id',
      name: 'Existing',
      email: 'dup@example.com',
      password_hash: 'hash',
      language: 'en',
    });

    const res3 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Another', email: 'dup@example.com', password: 'password123' }),
    });
    assert.equal(res3.status, 409);
    const body3 = await res3.json();
    assert.equal(body3.error.code, 'EMAIL_ALREADY_EXISTS');
  });

  // Login Endpoint Tests
  test('POST /api/auth/login: authenticates valid credentials and rejects invalid passwords', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
    mockUsers.push({
      id: 'user-login-test',
      name: 'Kavita Rao',
      email: 'kavita@example.com',
      password_hash: passwordHash,
      language: 'en',
    });

    // Valid login
    const validRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kavita@example.com', password: 'CorrectPassword123!' }),
    });
    assert.equal(validRes.status, 200);
    const validBody = await validRes.json();
    assert.equal(validBody.success, true);
    assert.equal(validBody.data.user.name, 'Kavita Rao');
    assert.ok(validBody.data.tokens.accessToken);
    assert.ok(validBody.data.tokens.refreshToken);

    // Invalid password
    const invalidRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kavita@example.com', password: 'WrongPassword' }),
    });
    assert.equal(invalidRes.status, 401);
    const invalidBody = await invalidRes.json();
    assert.equal(invalidBody.error.code, 'INVALID_CREDENTIALS');

    // Unknown email
    const unknownRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'any' }),
    });
    assert.equal(unknownRes.status, 401);
  });

  // Refresh Token Rotation & Revocation Tests
  test('POST /api/auth/refresh: rotates refresh token and prevents reuse of revoked tokens', async () => {
    const user = { id: 'u-refresh', name: 'Refresh Tester', email: 'refresh@example.com', language: 'en' };
    mockUsers.push({ ...user, password_hash: 'hash' });

    const initialRefreshToken = signRefreshToken(user);
    const initialHash = hashToken(initialRefreshToken);

    mockRefreshTokens.push({
      id: 'tok-1',
      user_id: user.id,
      token_hash: initialHash,
      expires_at: new Date(Date.now() + 100000),
      revoked: false,
    });

    // 1st Refresh: should succeed and rotate token
    const refreshRes1 = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: initialRefreshToken }),
    });

    assert.equal(refreshRes1.status, 200);
    const body1 = await refreshRes1.json();
    assert.equal(body1.success, true);
    assert.ok(body1.data.accessToken);
    assert.ok(body1.data.refreshToken);
    assert.notEqual(body1.data.refreshToken, initialRefreshToken, 'Refresh token must be rotated');

    // Verify old token in DB is marked revoked
    const oldTok = mockRefreshTokens.find((t) => t.token_hash === initialHash);
    assert.equal(oldTok.revoked, true);

    // 2nd Refresh with OLD (now revoked) token: must be rejected with 401
    const replayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: initialRefreshToken }),
    });

    assert.equal(replayRes.status, 401);
    const replayBody = await replayRes.json();
    assert.equal(replayBody.error.code, 'UNAUTHORIZED');
  });

  // Logout Endpoint Tests
  test('POST /api/auth/logout: revokes token for authenticated caregiver', async () => {
    const user = { id: 'u-logout', name: 'Logout User', email: 'logout@example.com', language: 'en' };
    mockUsers.push({ ...user, password_hash: 'hash' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const tokenHash = hashToken(refreshToken);

    mockRefreshTokens.push({
      id: 'tok-logout',
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 100000),
      revoked: false,
    });

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });

    assert.equal(logoutRes.status, 200);
    const logoutBody = await logoutRes.json();
    assert.equal(logoutBody.success, true);
    assert.equal(logoutBody.message, 'Logged out successfully');

    // Verify token was revoked in DB
    const stored = mockRefreshTokens.find((t) => t.token_hash === tokenHash);
    assert.equal(stored.revoked, true);
  });

  // Delete Account Tests
  test('DELETE /api/auth/account: verifies password and permanently removes caregiver', async () => {
    const passwordHash = await bcrypt.hash('DeleteMe123!', 10);
    const user = {
      id: 'u-delete-target',
      name: 'To Be Deleted',
      email: 'delete@example.com',
      password_hash: passwordHash,
      language: 'en',
    };
    mockUsers.push(user);
    mockRefreshTokens.push({
      id: 'tok-del',
      user_id: user.id,
      token_hash: 'hash-del',
      expires_at: new Date(Date.now() + 100000),
      revoked: false,
    });

    const accessToken = signAccessToken(user);

    // Wrong password -> 403 Forbidden
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: 'WrongPassword' }),
    });
    assert.equal(wrongPassRes.status, 403);
    assert.equal(mockUsers.length, 1);

    // Correct password -> 200 OK and cascades deletion
    const correctPassRes = await fetch(`${baseUrl}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: 'DeleteMe123!' }),
    });
    assert.equal(correctPassRes.status, 200);
    const delBody = await correctPassRes.json();
    assert.equal(delBody.success, true);

    // User and refresh tokens removed from store
    assert.equal(mockUsers.length, 0);
    assert.equal(mockRefreshTokens.length, 0);
  });

  // Authentication Middleware Protection Tests
  test('Auth Middleware: blocks unauthenticated or malformed requests', async () => {
    // Missing Authorization header
    const missingRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'any' }),
    });
    assert.equal(missingRes.status, 401);
    const missingBody = await missingRes.json();
    assert.equal(missingBody.error.code, 'UNAUTHORIZED');

    // Invalid bearer format
    const malformedRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic not-a-bearer-token',
      },
      body: JSON.stringify({ refreshToken: 'any' }),
    });
    assert.equal(malformedRes.status, 401);

    // Tampered / invalid token
    const tamperedRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload',
      },
      body: JSON.stringify({ refreshToken: 'any' }),
    });
    assert.equal(tamperedRes.status, 401);
  });
});
