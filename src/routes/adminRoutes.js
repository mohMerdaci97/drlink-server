// src/routes/adminRouter.js
const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const requireSuperAdmin = require("../middlewares/requireSuperAdmin");

const stats = require("../controllers/adminStatsController");
const doctors = require("../controllers/adminDoctorController");
const specialties = require("../controllers/adminSpecialtyController");
const createDoctor = require("../controllers/adminCreateDoctorController");
const appointments = require("../controllers/adminAppointmentController");
const patients = require("../controllers/adminPatientsController");
const reports = require("../controllers/adminReportsController");
const admins = require("../controllers/adminManagementController");
const profile = require("../controllers/adminProfileController");
const clinics = require("../controllers/adminClinicsController");
const location = require("../controllers/locationController");
const subscription = require("../controllers/adminSubscriptionController");

// Wilayas & Communes
router.get("/wilayas", location.getWilayas);
router.get("/wilayas/:wilayaId/communes", location.getCommunesByWilaya);
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
router.post("/doctors", createDoctor.createDoctor);
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

// Clinics
router.get("/clinics", clinics.getAll);
router.get("/clinics/:id", clinics.getOne);
router.post("/clinics", clinics.create);
router.put("/clinics/:id", clinics.update);
router.delete("/clinics/:id", clinics.remove);

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

// Plans CRUD
router.get("/billing/plans", subscription.getPlans);
router.post("/billing/plans", subscription.createPlan);
router.patch("/billing/plans/:id", subscription.updatePlan);
router.delete("/billing/plans/:id", subscription.deletePlan);

// Doctor subscriptions
router.get("/billing/subscriptions", subscription.getAllSubscriptions);
router.get(
  "/billing/subscriptions/doctor/:doctorId",
  subscription.getDoctorSubscription,
);
router.post("/billing/subscriptions", subscription.assignSubscription);
router.patch(
  "/billing/subscriptions/:id/renew",
  subscription.renewSubscription,
);
router.patch(
  "/billing/subscriptions/:id/cancel",
  subscription.cancelSubscription,
);

// Payments
router.post("/billing/subscriptions/:id/payments", subscription.recordPayment);
router.get("/billing/subscriptions/:id/payments", subscription.getPayments);
router.delete("/billing/payments/:paymentId", subscription.deletePayment);

module.exports = router;
