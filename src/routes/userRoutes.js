const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");

router.get(
  "/me",
  auth(), // token required
  (req, res) => {
    res.json({
      message: "Profil utilisateur",
      user: req.user,
    });
  },
);

module.exports = router;
