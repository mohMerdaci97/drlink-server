const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const doctorController = require("../controllers/doctorController");
const doctorStats = require("../controllers/doctorStatsController");
const doctorAppointments = require("../controllers/doctorappointmentcontroller");
const doctorPatients = require("../controllers/doctorpatientscontroller");
const doctorClinics = require("../controllers/doctorclinicscontroller");

// Public
router.get("/specialties", doctorController.getDoctorSpecialities);

router.use(auth(["doctor"]));

// Onboarding
router.post(
  "/complete_profile",
  upload.single("photo"),
  doctorController.createProfile,
);

// Dashboard stats
router.get("/stats", doctorStats.getStats);

// Appointments
router.get("/appointments/today", doctorAppointments.getToday);
router.get("/appointments", doctorAppointments.getAll);
router.patch("/appointments/:id/confirm", doctorAppointments.confirm);
router.patch("/appointments/:id/cancel", doctorAppointments.cancel);
router.patch("/appointments/:id/complete", doctorAppointments.complete);

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
