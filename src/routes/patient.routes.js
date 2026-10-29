const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const ROLES = require("../constants/roles");
const {
  bookingLimiter,
  sensitiveActionLimiter,
} = require("../middlewares/rateLimiters");

const homeCtrl = require("../controllers/patient/patientHome.controller");
const profileCtrl = require("../controllers/patient/patientProfile.controller");
const doctorCtrl = require("../controllers/patient/patientDoctor.controller");
const appointmentCtrl = require("../controllers/patient/patientAppointment.controller");

const {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require("../validations/patient/patientProfile.validation");

const {
  doctorIdParamSchema,
  wilayaIdParamSchema,
  doctorsQuerySchema,
  slotsQuerySchema,
  availableDaysQuerySchema,
  nearbyQuerySchema,
  suggestionsQuerySchema,
} = require("../validations/patient/patientDoctor.validation");

const {
  appointmentIdParamSchema,
  listQuerySchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
} = require("../validations/patient/patientAppointment.validation");

// Every route below is for logged in patients only
router.use(auth([ROLES.PATIENT]));

/* HOME */
router.get("/home", homeCtrl.getHomeData);

/* PROFILE */
router.get("/profile", profileCtrl.getProfile);

router.put(
  "/profile",
  sensitiveActionLimiter,
  validate(updateProfileSchema, "body"),
  profileCtrl.updateProfile,
);

router.put(
  "/profile/password",
  sensitiveActionLimiter,
  validate(changePasswordSchema, "body"),
  profileCtrl.changePassword,
);

router.post(
  "/profile/delete-account",
  sensitiveActionLimiter,
  validate(deleteAccountSchema, "body"),
  profileCtrl.deleteAccount,
);

/* DOCTORS (fixed paths first, then /:id) */
router.get(
  "/doctors/nearby",
  validate(nearbyQuerySchema, "query"),
  doctorCtrl.getNearbyDoctors,
);

router.get(
  "/doctors/suggestions",
  validate(suggestionsQuerySchema, "query"),
  doctorCtrl.getSuggestions,
);

router.get("/doctors/specialties", doctorCtrl.getSpecialties);

router.get("/doctors/wilayas", doctorCtrl.getWilayas);

router.get(
  "/doctors/wilayas/:id/communes",
  validate(wilayaIdParamSchema, "params"),
  doctorCtrl.getCommunes,
);

router.get(
  "/doctors",
  validate(doctorsQuerySchema, "query"),
  doctorCtrl.getDoctors,
);

router.get(
  "/doctors/:id",
  validate(doctorIdParamSchema, "params"),
  doctorCtrl.getDoctorDetail,
);

router.get(
  "/doctors/:id/slots",
  validate(doctorIdParamSchema, "params"),
  validate(slotsQuerySchema, "query"),
  doctorCtrl.getAvailableSlots,
);

router.get(
  "/doctors/:id/available-days",
  validate(doctorIdParamSchema, "params"),
  validate(availableDaysQuerySchema, "query"),
  doctorCtrl.getAvailableDays,
);

/* APPOINTMENTS */
router.get(
  "/appointments",
  validate(listQuerySchema, "query"),
  appointmentCtrl.getMyAppointments,
);

router.get(
  "/appointments/:id",
  validate(appointmentIdParamSchema, "params"),
  appointmentCtrl.getOne,
);

router.post(
  "/appointments",
  bookingLimiter,
  validate(createAppointmentSchema, "body"),
  appointmentCtrl.createAppointment,
);

router.patch(
  "/appointments/:id/reschedule",
  bookingLimiter,
  validate(appointmentIdParamSchema, "params"),
  validate(rescheduleAppointmentSchema, "body"),
  appointmentCtrl.reschedule,
);

router.patch(
  "/appointments/:id/cancel",
  bookingLimiter,
  validate(appointmentIdParamSchema, "params"),
  appointmentCtrl.cancelAppointment,
);

module.exports = router;
