const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");

const profileController = require("../controllers/assistant/assistantProfileController");
const patientController = require("../controllers/assistant/assistantPatientsController");

router.use(auth(["assistant"]));

/* ───────── PROFILE ───────── */
router.get("/profile", profileController.getProfile);

/* ───────── APPOINTMENTS ───────── */
router.get("/appointments/today", profileController.getTodayAppointments);
router.patch(
  "/appointments/:id/status",
  profileController.updateAppointmentStatus,
);

router.post("/appointments", patientController.bookAppointmentForPatient);

/* ───────── DASHBOARD ───────── */
router.get("/dashboard/summary", patientController.getDashboardSummary);

/* ───────── PATIENTS ───────── */
router.post("/patients", patientController.createPatient);

router.get("/patients/search", patientController.searchPatients);

router.get("/patients/recent", patientController.getRecentlyAddedPatients);

router.get("/patients", patientController.getPatients);

router.get("/patients/:id", patientController.getPatient);

router.patch("/patients/:id", patientController.updatePatient);

router.delete("/patients/:id", patientController.removePatientFromMyList);

module.exports = router;
