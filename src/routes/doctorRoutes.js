const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const doctorController = require("../controllers/doctor/doctorController");
const doctorStats = require("../controllers/doctor/doctorStatsController");
const doctorAppointments = require("../controllers/doctor/doctorAppointmentController");
const doctorPatients = require("../controllers/doctor/doctorPatientsController");
const doctorClinics = require("../controllers/doctor/doctorClinicsController");
const doctorProfile = require("../controllers/doctor/doctorProfileController");
const location = require("../controllers/locationController");
const doctorAssistantController = require("../controllers/doctor/doctorAssistantController");

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

router.get("/subscription", auth(["doctor"]), async (req, res) => {
  const { DoctorSubscription, Plan } = require("../models");
  const doctor = await require("../models").Doctor.findOne({
    where: { user_id: req.user.id },
  });
  if (!doctor) return res.json(null);
  const sub = await DoctorSubscription.findOne({
    where: {
      doctor_id: doctor.id,
      status: { [require("sequelize").Op.in]: ["active", "grace", "expired"] },
    },
    order: [["created_at", "DESC"]],
    include: [{ model: Plan, as: "Plan" }],
  });
  res.json(sub ?? null);
});
module.exports = router;

// Assistants
router.get("/assistants", doctorAssistantController.getAssistants);
router.get("/assistants/:id", doctorAssistantController.getOne);
router.post("/assistants", doctorAssistantController.createAssistant);
router.patch("/assistants/:id", doctorAssistantController.updateAssistant);
router.delete("/assistants/:id", doctorAssistantController.deleteAssistant);
