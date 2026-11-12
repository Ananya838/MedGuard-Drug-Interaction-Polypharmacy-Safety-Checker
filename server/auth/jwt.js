import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';

/**
 * Signs a short-lived access JWT for an authenticated user.
 * @param {object} user - { id, email, name, language }
 * @returns {string} Signed JWT
 */
export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    language: user.language || 'en',
  };

  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Signs a refresh token for session rotation.
 * @param {object} user - { id }
 * @returns {string} Signed refresh JWT
 */
export function signRefreshToken(user) {
  const payload = {
    sub: user.id,
    jti: crypto.randomBytes(16).toString('hex'), // unique identifier for each token issuance
  };

  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verifies and decodes an access JWT.
 * @param {string} token
 * @returns {object} Decoded token payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

/**
 * Verifies and decodes a refresh JWT.
 * @param {string} token
 * @returns {object} Decoded token payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
}

/**
 * Hashes a token string using SHA-256 for secure database storage.
 * @param {string} rawToken
 * @returns {string} Hex SHA-256 hash
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

