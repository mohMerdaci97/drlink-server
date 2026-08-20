const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");

const dashboardController = require("../controllers/assistant/assistantDashboardController");
const profileController = require("../controllers/assistant/assistantProfileController");
const patientController = require("../controllers/assistant/assistantPatientsController");

router.use(auth(["assistant"]));

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

router.get("/profile", profileController.getProfile);

router.patch("/profile", profileController.updateProfile);

router.patch("/profile/password", profileController.changePassword);

router.patch("/profile/reset-password", profileController.resetPassword);

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard / Appointments
// ─────────────────────────────────────────────────────────────────────────────

router.get("/appointments/today", dashboardController.getTodayAppointments);

router.patch(
  "/appointments/:id/status",
  dashboardController.updateAppointmentStatus,
);

router.post("/appointments", patientController.bookAppointmentForPatient);

router.get("/dashboard/summary", patientController.getDashboardSummary);

router.get("/clinics", patientController.getMyClinics);

// ─────────────────────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────────────────────

router.post("/patients", patientController.createPatient);

router.get("/patients/search", patientController.searchPatients);

router.get("/patients/recent", patientController.getRecentlyAddedPatients);

router.get("/patients", patientController.getPatients);

router.get("/patients/:id", patientController.getPatient);

router.patch("/patients/:id", patientController.updatePatient);

router.delete("/patients/:id", patientController.removePatientFromMyList);

module.exports = router;
