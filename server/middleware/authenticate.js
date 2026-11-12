import { verifyAccessToken } from '../auth/jwt.js';

/**
 * Authentication middleware that verifies JWT Bearer token on protected routes.
 * Populates req.user with { id, email, name, language }.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid format. Please log in.',
      },
    });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      language: decoded.language,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token. Please log in or refresh your session.',
      },
    });
  }
}

