import bcrypt from 'bcryptjs';
import { getPool } from '../config.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from './jwt.js';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function registerUser({ name, email, password, language = 'en' }) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    const err = new Error('Full name is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    const err = new Error('A valid email address is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    const err = new Error('Password must be at least 8 characters long.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const pool = getPool();
  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already registered
  const existingRes = await pool.query(
    'SELECT id FROM users WHERE lower(email) = $1',
    [normalizedEmail]
  );

  if (existingRes.rows.length > 0) {
    const err = new Error('An account with this email address already exists.');
    err.code = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert new user
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, language)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, language, created_at`,
    [name.trim(), normalizedEmail, passwordHash, language]
  );

  const newUser = userRes.rows[0];

  // Generate tokens
  const accessToken = signAccessToken(newUser);
  const refreshToken = signRefreshToken(newUser);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  // Store hashed refresh token
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [newUser.id, tokenHash, expiresAt]
  );

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      language: newUser.language,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function loginUser({ email, password }) {
  if (!email || !password) {
    const err = new Error('Email and password are required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const pool = getPool();
  const normalizedEmail = email.trim().toLowerCase();

  const userRes = await pool.query(
    `SELECT id, name, email, password_hash, language
     FROM users
     WHERE lower(email) = $1`,
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    const err = new Error('Invalid email or password.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const user = userRes.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      language: user.language,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function refreshSession({ refreshToken }) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    const err = new Error('Refresh token is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (jwtErr) {
    const err = new Error('Invalid or expired refresh token.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const pool = getPool();
  const tokenHash = hashToken(refreshToken);

  const tokenRes = await pool.query(
    `SELECT id, user_id, revoked, expires_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (tokenRes.rows.length === 0) {
    const err = new Error('Refresh token not recognized.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const tokenRecord = tokenRes.rows[0];

  if (tokenRecord.revoked) {
    const err = new Error('Refresh token has already been revoked. Please log in again.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [tokenRecord.id]);
    const err = new Error('Refresh token has expired. Please log in again.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const userRes = await pool.query(
    'SELECT id, name, email, language FROM users WHERE id = $1',
    [tokenRecord.user_id]
  );

  if (userRes.rows.length === 0) {
    const err = new Error('User account not found.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const user = userRes.rows[0];

  // Rotate token: revoke old token and insert newly signed token
  await pool.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [tokenRecord.id]);

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, newTokenHash, newExpiresAt]
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser({ refreshToken, userId }) {
  if (!refreshToken) {
    const err = new Error('Refresh token is required to log out.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const pool = getPool();
  const tokenHash = hashToken(refreshToken);

  await pool.query(
    `UPDATE refresh_tokens
     SET revoked = true
     WHERE token_hash = $1 AND user_id = $2`,
    [tokenHash, userId]
  );

  return {
    success: true,
    message: 'Logged out successfully',
  };
}

export async function deleteAccount({ userId, password }) {
  if (!password) {
    const err = new Error('Password confirmation is required to delete your account.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const pool = getPool();

  const userRes = await pool.query(
    'SELECT id, password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (userRes.rows.length === 0) {
    const err = new Error('User account not found.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const user = userRes.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    const err = new Error('Incorrect password. Account deletion aborted.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Deleting user cascades to refresh_tokens, patients, caregiver_access, etc.
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);

  return {
    success: true,
    message: 'Account and all associated patient records permanently deleted',
  };
}

