const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const doctorController = require("../controllers/doctorController");
const doctorStats = require("../controllers/doctorStatsController");
const doctorAppointments = require("../controllers/doctorAppointmentController");
const doctorPatients = require("../controllers/doctorPatientsController");
const doctorClinics = require("../controllers/doctorClinicsController");
const doctorProfile = require("../controllers/doctorProfileController");
const location = require("../controllers/locationController");

// Public
router.get("/specialties", doctorController.getDoctorSpecialities);

// Wilayas & Communes
router.get("/wilayas", location.getWilayas);
router.get("/wilayas/:wilayaId/communes", location.getCommunesByWilaya);

router.use(auth(["doctor"]));

// Onboarding
router.post(
  "/complete_profile",
  upload.single("photo"),
  doctorController.createProfile,
);

// Dashboard stats
router.get("/stats", doctorStats.getStats);

// Profile
router.get("/profile", doctorProfile.getProfile);
router.patch("/profile", doctorProfile.updateProfile);
router.patch(
  "/profile/photo",
  upload.single("photo"),
  doctorProfile.updatePhoto,
);
router.patch("/profile/password", doctorProfile.changePassword);

// Appointments
router.get("/appointments/today", doctorAppointments.getToday);
router.get("/appointments", doctorAppointments.getAll);
router.patch("/appointments/:id/confirm", doctorAppointments.confirm);
router.patch("/appointments/:id/cancel", doctorAppointments.cancel);
router.patch("/appointments/:id/complete", doctorAppointments.complete);
router.patch(
  "/profile/reset-password",
  auth(["doctor"]),
  doctorProfile.resetPassword,
);

// Patients
router.get("/patients", doctorPatients.getAll);
router.get("/patients/:patientId", doctorPatients.getOne);

// Clinics
router.get("/clinics/available", doctorClinics.getAvailable);
router.get("/clinics", doctorClinics.getAll);
router.post("/clinics", doctorClinics.createClinic);
router.patch("/clinics/:clinicId", doctorClinics.updateClinic);
router.post("/clinics/:clinicId/schedule", doctorClinics.addSchedule);
router.patch("/clinics/schedule/:scheduleId", doctorClinics.updateSchedule);
router.delete("/clinics/schedule/:scheduleId", doctorClinics.removeSchedule);
router.delete("/clinics/:clinicId", doctorClinics.removeClinic);
module.exports = router;
