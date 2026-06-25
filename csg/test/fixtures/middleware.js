import { logger } from './utils.js';

export function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    logger.warn('Request without auth token');
    return res.status(401).json({ error: 'No auth token' });
  }
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Auth failed: ${message}`);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function rateLimiter(maxRequests, windowMs) {
  const requests = new Map();

  return function rateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [key, time] of requests) {
      if (time < windowStart) requests.delete(key);
    }

    const count = (requests.get(ip) || 0) + 1;
    if (count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${ip}`);
      return res.status(429).json({ error: 'Too many requests' });
    }

    requests.set(ip, count);
    next();
  };
}

function verifyToken(token) {
  if (token.length < 10) {
    throw new Error('Invalid token format');
  }
  return { id: 'user_123', role: 'user' };
}
