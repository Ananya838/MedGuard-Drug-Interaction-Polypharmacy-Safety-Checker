/**
 * Maps application error codes to appropriate HTTP status codes.
 */
function getStatusCode(code) {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'UNAUTHORIZED':
    case 'INVALID_CREDENTIALS':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'EMAIL_ALREADY_EXISTS':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    default:
      return 500;
  }
}

/**
 * Global Express error handling middleware.
 * Guarantees consistent error envelope and strict privacy (zero logging of request bodies or patient data).
 */
export function errorHandler(err, req, res, next) {
  const code = err.code || 'INTERNAL_ERROR';
  const status = err.status || getStatusCode(code);

  // In non-test environments, log internal system errors without exposing request payload or patient health data
  if (process.env.NODE_ENV !== 'test' && status >= 500) {
    console.error(`[SYSTEM_ERROR] ${req.method} ${req.path} -> ${err.name}: ${err.message}`);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message: err.message || 'An unexpected internal error occurred.',
    },
  });
}

