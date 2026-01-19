const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * ================================
 * VERIFY ACCESS TOKEN (RBAC READY)
 * ================================
 * - Verifies JWT
 * - Ensures token type is "access"
 * - Fetches user role from DB
 * - Attaches req.user = { id, role }
 */
exports.verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access token required" });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token.length > 1000) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    // FETCH USER TO GET ROLE (REQUIRED FOR RBAC)
    const user = await User.findById(decoded.id).select("role");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    //THIS IS WHAT RBAC NEEDS
    req.user = {
      id: user._id,
      role: user.role
    };

    req.userId = decoded.id;
    req.user = decoded; // Added for common compatibility
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
        expired: true
      });
    }

    return res.status(401).json({ message: "Invalid access token" });
  }
};

/**
 * ================================
 * LOGIN RATE LIMITER
 * ================================
 */
// Alias for common usage
exports.authenticateToken = exports.verifyAccessToken;

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but allows request through if not
 */
exports.optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === "access") {
      req.userId = decoded.id;
      req.user = decoded;
    }
  } catch (err) {
    // Ignore errors for optional auth
  }
  next();
};

// Alias for compatibility with other branches
exports.optionalAuth = exports.optionalAuthenticate;

exports.loginRateLimiter = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 100; // Increased for development/testing
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!attempts.has(identifier)) {
      attempts.set(identifier, []);
    }

    const userAttempts = attempts.get(identifier);
    const recentAttempts = userAttempts.filter(time => now - time < WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil(
          (WINDOW_MS - (now - recentAttempts[0])) / 1000
        )
      });
    }

    recentAttempts.push(now);
    attempts.set(identifier, recentAttempts);
    next();
  };
})();

/**
 * ================================
 * GENERAL RATE LIMITER
 * ================================
 */
exports.generalRateLimiter = (() => {
  const requests = new Map();
  const MAX_REQUESTS = 100;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }

    const userRequests = requests.get(identifier);
    const recentRequests = userRequests.filter(time => now - time < WINDOW_MS);

    if (recentRequests.length >= MAX_REQUESTS) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(
          (WINDOW_MS - (now - recentRequests[0])) / 1000
        )
      });
    }

    recentRequests.push(now);
    requests.set(identifier, recentRequests);
    next();
  };
})();

