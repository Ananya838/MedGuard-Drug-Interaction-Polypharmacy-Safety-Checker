import rateLimit from 'express-rate-limit';

/**
 * Standard error response generator for rate limited requests.
 */
function rateLimitHandler(message) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message,
      },
    });
  };
}

/**
 * Rate limiter for authentication endpoints: 5 attempts per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many login attempts. Please try again after 15 minutes.'),
});

/**
 * Rate limiter for safety engine check: 30 checks per minute per IP.
 */
export const checkRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Safety check limit exceeded. Please wait a minute before running another check.'),
});

