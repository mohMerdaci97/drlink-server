const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  // 5 attempts per IP / window
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Trop de tentatives de connexion. Veuillez réessayer plus tard.",
  },

  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json(options.message);
  },
});

module.exports = {
  loginLimiter,
};
