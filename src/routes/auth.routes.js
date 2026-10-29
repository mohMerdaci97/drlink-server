const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const controller = require("../controllers/auth.controller");

const { loginLimiter } = require("../middlewares/rateLimiters");

const { loginSchema } = require("../validations/auth.validation");

const turnstile = require("../middlewares/security/turnstile.middleware");

router.post(
  "/login",
  loginLimiter,
  validate(loginSchema, "body"),
  turnstile,
  controller.login,
);

router.post("/refresh", controller.refresh);

router.post("/logout", controller.logout);

router.get("/me", auth(), controller.me);

module.exports = router;
