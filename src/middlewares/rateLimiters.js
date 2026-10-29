const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Same JSON error shape everywhere
const createLimiter = ({ windowMs, max, message, ...options }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    handler: (req, res, next, opts) =>
      res.status(opts.statusCode).json(opts.message),
    ...options,
  });

// Admin login: 5 failed attempts per IP / 15 min
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Trop de tentatives de connexion. Veuillez réessayer plus tard.",
});

// Patient login: 10 failed attempts per IP + email / 15 min
const patientLoginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}:${String(req.body?.email || "").toLowerCase()}`,
  message: "Trop de tentatives de connexion. Veuillez réessayer plus tard.",
});

// Sign up: 10 accounts per IP / hour
const patientRegisterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Trop de créations de compte. Veuillez réessayer plus tard.",
});

// Token refresh: 30 per IP / minute
const patientRefreshLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Trop de requêtes. Veuillez réessayer dans une minute.",
});

// Booking, reschedule, cancel: 10 per user / minute (auth must run first)
const bookingLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: "Trop de tentatives. Réessayez dans une minute.",
});
// Password change, email change, account deletion: 5 failed tries per user / 15 min
const sensitiveActionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: "Trop de tentatives. Veuillez réessayer plus tard.",
});
module.exports = {
  loginLimiter,
  patientLoginLimiter,
  patientRegisterLimiter,
  patientRefreshLimiter,
  bookingLimiter,
  sensitiveActionLimiter,
};
