const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const ROLES = require("../constants/roles");
const {
  patientLoginLimiter,
  patientRegisterLimiter,
  patientRefreshLimiter,
} = require("../middlewares/rateLimiters");

const controller = require("../controllers/patient/patientAuth.controller");

const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require("../validations/patient/patientAuth.validation");

const patientOnly = auth([ROLES.PATIENT]);

router.post(
  "/register",
  patientRegisterLimiter,
  validate(registerSchema, "body"),
  controller.register,
);

router.post(
  "/login",
  patientLoginLimiter,
  validate(loginSchema, "body"),
  controller.login,
);

router.post(
  "/refresh",
  patientRefreshLimiter,
  validate(refreshSchema, "body"),
  controller.refresh,
);

router.post("/logout", validate(logoutSchema, "body"), controller.logout);

router.post("/logout-all", patientOnly, controller.logoutAll);

router.get("/me", patientOnly, controller.me);

module.exports = router;
