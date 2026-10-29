const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const clinicUpload = require("../middlewares/clinicUpload");
const validate = require("../middlewares/validate");

// Controllers
const doctorOnboarding = require("../controllers/doctor/doctorOnboarding.controller");
const doctorStats = require("../controllers/doctor/doctorStats.controller");
const doctorAppointments = require("../controllers/doctor/doctorAppointment.controller");
const doctorPatients = require("../controllers/doctor/doctorPatients.controller");
const doctorClinics = require("../controllers/doctor/doctorClinics.controller");
const doctorProfile = require("../controllers/doctor/doctorProfile.controller");
const doctorSubscription = require("../controllers/doctor/doctorSubscription.controller");
const doctorAssistant = require("../controllers/doctor/doctorAssistant.controller");
const location = require("../controllers/locationController");

// Shared validation
const {
  idSchema,
  wilayaIdSchema,
  patientIdSchema,
  clinicIdSchema,
  scheduleIdSchema,
} = require("../validations/shared/common.validation");

// Doctor validation
const {
  completeProfileSchema,
} = require("../validations/doctor/onboarding.validation");

const {
  updateProfileSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateSlotDurationSchema,
} = require("../validations/doctor/profile.validation");

const {
  appointmentListQuerySchema,
} = require("../validations/doctor/appointment.validation");

const {
  patientListQuerySchema,
} = require("../validations/doctor/patient.validation");

const {
  createClinicSchema,
  updateClinicSchema,
  createScheduleSchema,
  updateScheduleSchema,
  availableClinicQuerySchema,
} = require("../validations/doctor/clinic.validation");

const {
  assistantListQuerySchema,
  createAssistantSchema,
  updateAssistantSchema,
} = require("../validations/doctor/assistant.validation");

// PUBLIC

router.get("/specialties", doctorOnboarding.getDoctorSpecialities);

// Wilayas
router.get("/wilayas", location.getWilayas);

// Communes
router.get(
  "/wilayas/:wilayaId/communes",
  validate(wilayaIdSchema, "params"),
  location.getCommunesByWilaya,
);

// AUTHENTICATION

router.use(auth(["doctor"]));

// ONBOARDING


router.post(
  "/complete_profile",
  upload.single("photo"),
  validate(completeProfileSchema),
  doctorOnboarding.createProfile,
);

// DASHBOARD

router.get("/stats", doctorStats.getStats);

// PROFILE

router.get("/profile", doctorProfile.getProfile);

router.patch(
  "/profile",
  validate(updateProfileSchema),
  doctorProfile.updateProfile,
);

router.patch(
  "/profile/photo",
  upload.single("photo"),
  doctorProfile.updatePhoto,
);

router.patch(
  "/profile/password",
  validate(changePasswordSchema),
  doctorProfile.changePassword,
);

router.patch(
  "/profile/reset-password",
  validate(resetPasswordSchema),
  doctorProfile.resetPassword,
);

router.patch(
  "/profile/slot-duration",
  validate(updateSlotDurationSchema),
  doctorProfile.updateSlotDuration,
);

// APPOINTMENTS

router.get("/appointments/today", doctorAppointments.getToday);

router.get(
  "/appointments",
  validate(appointmentListQuerySchema, "query"),
  doctorAppointments.getAll,
);

router.patch(
  "/appointments/:id/confirm",
  validate(idSchema, "params"),
  doctorAppointments.confirm,
);

router.patch(
  "/appointments/:id/cancel",
  validate(idSchema, "params"),
  doctorAppointments.cancel,
);

router.patch(
  "/appointments/:id/complete",
  validate(idSchema, "params"),
  doctorAppointments.complete,
);

// ============================================================
// PATIENTS
// ============================================================

router.get(
  "/patients",
  validate(patientListQuerySchema, "query"),
  doctorPatients.getAll,
);

router.get(
  "/patients/:patientId",
  validate(patientIdSchema, "params"),
  doctorPatients.getOne,
);

// CLINICS

router.get("/clinics", doctorClinics.getAll);

router.get(
  "/clinics/available",
  validate(availableClinicQuerySchema, "query"),
  doctorClinics.getAvailable,
);

// Create private clinic
router.post(
  "/clinics",
  validate(createClinicSchema),
  doctorClinics.createClinic,
);

// Update clinic information
router.patch(
  "/clinics/:clinicId",
  validate(clinicIdSchema, "params"),
  validate(updateClinicSchema),
  doctorClinics.updateClinic,
);

// Update clinic photo
router.patch(
  "/clinics/:clinicId/photo",
  validate(clinicIdSchema, "params"),
  clinicUpload.single("photo"),
  doctorClinics.updatePhoto,
);

// Add clinic schedule
router.post(
  "/clinics/:clinicId/schedule",
  validate(clinicIdSchema, "params"),
  validate(createScheduleSchema),
  doctorClinics.addSchedule,
);

// Update clinic schedule
router.patch(
  "/clinics/schedule/:scheduleId",
  validate(scheduleIdSchema, "params"),
  validate(updateScheduleSchema),
  doctorClinics.updateSchedule,
);

// Delete clinic schedule
router.delete(
  "/clinics/schedule/:scheduleId",
  validate(scheduleIdSchema, "params"),
  doctorClinics.removeSchedule,
);

// Remove/delete clinic
router.delete(
  "/clinics/:clinicId",
  validate(clinicIdSchema, "params"),
  doctorClinics.removeClinic,
);

// SUBSCRIPTION

router.get("/subscription", doctorSubscription.getSubscription);

// ASSISTANTS

router.get(
  "/assistants",
  validate(assistantListQuerySchema, "query"),
  doctorAssistant.getAssistants,
);

router.get(
  "/assistants/:id",
  validate(idSchema, "params"),
  doctorAssistant.getOne,
);

router.post(
  "/assistants",
  validate(createAssistantSchema),
  doctorAssistant.createAssistant,
);

router.patch(
  "/assistants/:id",
  validate(idSchema, "params"),
  validate(updateAssistantSchema),
  doctorAssistant.updateAssistant,
);

router.delete(
  "/assistants/:id",
  validate(idSchema, "params"),
  doctorAssistant.deleteAssistant,
);

module.exports = router;
