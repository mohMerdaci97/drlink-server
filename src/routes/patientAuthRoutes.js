const express = require("express");
const router = express.Router();

const controller = require("../controllers/patientAuthController");
const auth = require("../middlewares/auth.middleware");

const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many attempts. Try later.",
  },
});

router.post("/register", controller.register);
router.post("/login", loginLimiter, controller.login);
router.post("/refresh", controller.refresh);
router.get("/me", auth(), controller.me);
router.post("/logout", controller.logout);

module.exports = router;
