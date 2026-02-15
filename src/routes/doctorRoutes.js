const router = require("express").Router();
const {
  createProfile,
  getDoctorSpecialities,
} = require("../controllers/doctorController");
const auth = require("../middlewares/authMiddleware");

router.post("/complete_profile", auth, createProfile);
router.get("/specialties", getDoctorSpecialities);

module.exports = router;
