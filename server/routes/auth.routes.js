import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  deleteAccount,
} from '../auth/authService.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// In test environment, bypass rate limiter to avoid spurious 429s during test loops
const loginLimiter = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : authRateLimiter;

/**
 * POST /api/auth/register
 * Registers a new caregiver account and issues initial tokens.
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, language } = req.body || {};
    const result = await registerUser({ name, email, password, language });
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates caregiver with email + password, returning tokens.
 */
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await loginUser({ email, password });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token and issues a new access token.
 */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    const result = await refreshSession({ refreshToken });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Revokes the provided refresh token session for the authenticated user.
 */
authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    const result = await logoutUser({ refreshToken, userId: req.user.id });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/account
 * Deletes the caregiver account and cascades deletion of all patient records.
 */
authRouter.delete('/account', authenticate, async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const result = await deleteAccount({ userId: req.user.id, password });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

