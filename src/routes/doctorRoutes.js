const router = require("express").Router();
const {
  createProfile,
  getDoctorSpecialities,
} = require("../controllers/doctorController");
const auth = require("../middlewares/authMiddleware");

router.post("/complete_profile", auth, upload.single("photo"), createProfile);

router.get("/specialties", getDoctorSpecialities);

module.exports = router;
