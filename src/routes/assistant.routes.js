const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");

const {
  profileUpdateSchema,
  changePasswordSchema,
  resetPasswordSchema,
} = require("../validations/assistant/profile.validation");

const {
  appointmentStatusSchema,
  bookAppointmentSchema,
  appointmentIdParamsSchema,
  slotsQuerySchema,
} = require("../validations/assistant/appointment.validation");

const {
  createPatientSchema,
  updatePatientSchema,
  patientSearchSchema,
  patientListQuerySchema,
  recentPatientsQuerySchema,
  patientIdParamsSchema,
} = require("../validations/assistant/patient.validation");

const dashboardController = require("../controllers/assistant/assistantDashboard.controller");
const profileController = require("../controllers/assistant/assistantProfile.controller");
const appointmentController = require("../controllers/assistant/assistantAppointment.controller");
const patientController = require("../controllers/assistant/assistantPatient.controller");

// All assistant endpoints require authentication.
router.use(auth(["assistant"]));

// Profile
router.get("/profile", profileController.getProfile);
router.patch(
  "/profile",
  validate(profileUpdateSchema, "body"),
  profileController.updateProfile,
);
router.patch(
  "/profile/password",
  validate(changePasswordSchema, "body"),
  profileController.changePassword,
);
router.patch(
  "/profile/reset-password",
  validate(resetPasswordSchema, "body"),
  profileController.resetPassword,
);

// Dashboard
router.get("/dashboard/summary", dashboardController.getDashboardSummary);

// Appointments
router.get("/appointments/today", appointmentController.getTodaysAppointments);
router.patch(
  "/appointments/:id/status",
  validate(appointmentIdParamsSchema, "params"),
  validate(appointmentStatusSchema, "body"),
  appointmentController.updateAppointmentStatus,
);
router.post(
  "/appointments",
  validate(bookAppointmentSchema, "body"),
  appointmentController.bookAppointmentForPatient,
);
router.get(
  "/slots",
  validate(slotsQuerySchema, "query"),
  appointmentController.getAvailableSlots,
);
router.get("/clinics", appointmentController.getMyClinics);

// Patients
router.post(
  "/patients",
  validate(createPatientSchema, "body"),
  patientController.createPatient,
);
router.get(
  "/patients/search",
  validate(patientSearchSchema, "query"),
  patientController.searchPatients,
);
router.get(
  "/patients/recent",
  validate(recentPatientsQuerySchema, "query"),
  patientController.getRecentlyAddedPatients,
);
router.get(
  "/patients",
  validate(patientListQuerySchema, "query"),
  patientController.getPatients,
);
router.get(
  "/patients/:id",
  validate(patientIdParamsSchema, "params"),
  patientController.getPatient,
);
router.patch(
  "/patients/:id",
  validate(patientIdParamsSchema, "params"),
  validate(updatePatientSchema, "body"),
  patientController.updatePatient,
);
router.delete(
  "/patients/:id",
  validate(patientIdParamsSchema, "params"),
  patientController.removePatientFromMyList,
);

module.exports = router;
