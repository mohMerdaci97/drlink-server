// src/routes/adminRouter.js
const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const requireSuperAdmin = require("../middlewares/requireSuperAdmin");

const stats = require("../controllers/adminStatsController");
const doctors = require("../controllers/adminDoctorController");
const specialties = require("../controllers/adminSpecialtyController");
const appointments = require("../controllers/adminAppointmentController");
const patients = require("../controllers/adminPatientsController");
const reports = require("../controllers/adminReportsController");
const admins = require("../controllers/adminManagementController");
const profile = require("../controllers/adminProfileController");

// only admins allowed
router.use(auth(["admin"]));

// Profile
router.get("/profile", profile.getProfile);
router.patch("/profile", profile.updateProfile);
router.patch("/profile/password", profile.changePassword);
// Stats
router.get("/stats", stats.getStats);

// Doctors
router.get("/doctors", doctors.getAll);
router.get("/doctors/:id", doctors.getOne);
router.patch("/doctors/:id/approve", doctors.approve);
router.patch("/doctors/:id/reject", doctors.reject);
router.patch("/doctors/:id/toggle", doctors.toggleActive);

// Specialties
router.get("/specialties", specialties.getAll);
router.post("/specialties", specialties.create);
router.put("/specialties/:id", specialties.update);
router.delete("/specialties/:id", specialties.remove);

// Patients
router.get("/patients", patients.getAll);
router.get("/patients/:id", patients.getOne);
router.patch("/patients/:id/toggle", patients.toggleActive);

// Appointments
router.get("/appointments", appointments.getAll);

// Reports
router.get("/reports", reports.getReports);

// Admin management
router.get("/admins", requireSuperAdmin, admins.getAll);
router.post("/admins", requireSuperAdmin, admins.create);
router.patch("/admins/:id", requireSuperAdmin, admins.update);
router.patch("/admins/:id/toggle", requireSuperAdmin, admins.toggle);
router.patch(
  "/admins/:id/reset-password",
  requireSuperAdmin,
  admins.resetPassword,
);
router.delete("/admins/:id", requireSuperAdmin, admins.remove);

module.exports = router;
