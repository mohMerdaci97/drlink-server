const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const requireSuperAdmin = require("../middlewares/requireSuperAdmin");
const uploadSpecialty = require("../middlewares/uploadSpecialty");
const validate = require("../middlewares/validate");

const stats = require("../controllers/admin/adminStats.controller");
const doctors = require("../controllers/admin/adminDoctor.controller");
const appointments = require("../controllers/admin/adminAppointment.controller");
const clinics = require("../controllers/admin/adminClinics.controller");
const admins = require("../controllers/admin/adminManagement.controller");
const specialties = require("../controllers/admin/adminSpecialty.controller");
const patients = require("../controllers/admin/adminPatient.controller");
const reports = require("../controllers/admin/adminReport.controller");
const profile = require("../controllers/admin/adminProfile.controller");
const billing = require("../controllers/admin/adminBilling.controller");
const location = require("../controllers/locationController");
const auditLogs = require("../controllers/admin/adminAuditLog.controller");
// Shared validation
const {
  idSchema,
  doctorIdSchema,
  wilayaIdSchema,
  paymentIdSchema,
} = require("../validations/shared/common.validation");

// Admin validation
const {
  createDoctorSchema,
} = require("../validations/admin/doctor.validation");

const {
  createAdminSchema,
  updateAdminSchema,
  resetAdminPasswordSchema,
  adminListQuerySchema,
} = require("../validations/admin/admin.validation");

const {
  appointmentQuerySchema,
} = require("../validations/admin/appointment.validation");

const {
  createClinicSchema,
  updateClinicSchema,
} = require("../validations/admin/clinic.validation");

const {
  createSpecialtySchema,
  updateSpecialtySchema,
} = require("../validations/admin/specialty.validation");

const {
  patientListQuerySchema,
} = require("../validations/admin/patient.validation");

const {
  createPlanSchema,
  updatePlanSchema,
  subscriptionListQuerySchema,
  assignSubscriptionSchema,
  renewSubscriptionSchema,
  recordPaymentSchema,
} = require("../validations/admin/billing.validation");

//Audit log
const {
  auditLogQuerySchema,
  auditLogIdSchema,
} = require("../validations/admin/auditLog.validation");

// Wilayas & Communes
router.get("/wilayas", location.getWilayas);

router.get(
  "/wilayas/:wilayaId/communes",
  validate(wilayaIdSchema, "params"),
  location.getCommunesByWilaya,
);

// Authentication
router.use(auth(["admin"]));

//audit logs
router.get(
  "/audit-logs",
  requireSuperAdmin,
  validate(auditLogQuerySchema, "query"),
  auditLogs.getAll,
);

router.get(
  "/audit-logs/:id",
  requireSuperAdmin,
  validate(auditLogIdSchema, "params"),
  auditLogs.getOne,
);
// Profile
router.get("/profile", profile.getProfile);

router.patch("/profile", profile.updateProfile);

router.patch("/profile/password", profile.changePassword);

// Stats
router.get("/stats", stats.getStats);

// Doctors
router.get("/doctors", doctors.getAll);

router.post("/doctors", validate(createDoctorSchema), doctors.createDoctor);

router.get("/doctors/:id", validate(idSchema, "params"), doctors.getOne);

router.patch(
  "/doctors/:id/approve",
  validate(idSchema, "params"),
  doctors.approve,
);

router.patch(
  "/doctors/:id/reject",
  validate(idSchema, "params"),
  doctors.reject,
);

router.patch(
  "/doctors/:id/toggle",
  validate(idSchema, "params"),
  doctors.toggleActive,
);

// Specialties
router.get("/specialties", specialties.getAll);

router.post(
  "/specialties",
  uploadSpecialty.single("image"),
  validate(createSpecialtySchema),
  specialties.create,
);

router.put(
  "/specialties/:id",
  validate(idSchema, "params"),
  uploadSpecialty.single("image"),
  validate(updateSpecialtySchema),
  specialties.update,
);

router.delete(
  "/specialties/:id",
  validate(idSchema, "params"),
  specialties.remove,
);

// Patients
router.get(
  "/patients",
  validate(patientListQuerySchema, "query"),
  patients.getAll,
);

router.get("/patients/:id", validate(idSchema, "params"), patients.getOne);

router.patch(
  "/patients/:id/toggle",
  validate(idSchema, "params"),
  patients.toggleActive,
);

// Appointments
router.get(
  "/appointments",
  validate(appointmentQuerySchema, "query"),
  appointments.getAll,
);

// Reports
router.get("/reports", reports.getReports);

// Clinics
router.get("/clinics", clinics.getAll);

router.get("/clinics/:id", validate(idSchema, "params"), clinics.getOne);

router.post("/clinics", validate(createClinicSchema), clinics.create);

router.put(
  "/clinics/:id",
  validate(idSchema, "params"),
  validate(updateClinicSchema),
  clinics.update,
);

router.delete("/clinics/:id", validate(idSchema, "params"), clinics.remove);

// Admin management
router.get(
  "/admins",
  requireSuperAdmin,
  validate(adminListQuerySchema, "query"),
  admins.getAll,
);

router.post(
  "/admins",
  requireSuperAdmin,
  validate(createAdminSchema),
  admins.create,
);

router.patch(
  "/admins/:id",
  requireSuperAdmin,
  validate(idSchema, "params"),
  validate(updateAdminSchema),
  admins.update,
);

router.patch(
  "/admins/:id/toggle",
  requireSuperAdmin,
  validate(idSchema, "params"),
  admins.toggle,
);

router.patch(
  "/admins/:id/reset-password",
  requireSuperAdmin,
  validate(idSchema, "params"),
  validate(resetAdminPasswordSchema),
  admins.resetPassword,
);

router.delete(
  "/admins/:id",
  requireSuperAdmin,
  validate(idSchema, "params"),
  admins.remove,
);

// Billing - Plans
router.get("/billing/plans", billing.getPlans);

router.post("/billing/plans", validate(createPlanSchema), billing.createPlan);

router.patch(
  "/billing/plans/:id",
  validate(idSchema, "params"),
  validate(updatePlanSchema),
  billing.updatePlan,
);

router.delete(
  "/billing/plans/:id",
  validate(idSchema, "params"),
  billing.deletePlan,
);

// Billing - Subscriptions
router.get(
  "/billing/subscriptions",
  validate(subscriptionListQuerySchema, "query"),
  billing.getAllSubscriptions,
);

router.get(
  "/billing/subscriptions/doctor/:doctorId",
  validate(doctorIdSchema, "params"),
  billing.getDoctorSubscription,
);

router.post(
  "/billing/subscriptions",
  validate(assignSubscriptionSchema),
  billing.assignSubscription,
);

router.patch(
  "/billing/subscriptions/:id/renew",
  validate(idSchema, "params"),
  validate(renewSubscriptionSchema),
  billing.renewSubscription,
);

router.patch(
  "/billing/subscriptions/:id/cancel",
  validate(idSchema, "params"),
  billing.cancelSubscription,
);

// Billing - Payments
router.post(
  "/billing/subscriptions/:id/payments",
  validate(idSchema, "params"),
  validate(recordPaymentSchema),
  billing.recordPayment,
);

router.get(
  "/billing/subscriptions/:id/payments",
  validate(idSchema, "params"),
  billing.getPayments,
);

router.delete(
  "/billing/payments/:paymentId",
  validate(paymentIdSchema, "params"),
  billing.deletePayment,
);

module.exports = router;
