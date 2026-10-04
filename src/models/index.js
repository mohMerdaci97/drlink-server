const sequelize = require("../config/database");

const User = require("./user")(sequelize);
const Patient = require("./patient")(sequelize);
const Doctor = require("./doctor")(sequelize);
const Specialty = require("./specialty")(sequelize);
const Clinic = require("./clinic")(sequelize);
const DoctorClinic = require("./doctorClinic")(sequelize);
const Appointment = require("./appointment")(sequelize);
const Wilaya = require("./Wilaya")(sequelize);
const Commune = require("./Commune")(sequelize);
const Plan = require("./plan")(sequelize);
const DoctorSubscription = require("./doctorSubscription")(sequelize);
const SubscriptionPayment = require("./subscriptionPayment")(sequelize);
const Assistant = require("./assistant")(sequelize);
const DoctorPatient = require("./doctorPatient")(sequelize);
const AuditLog = require("./AuditLog")(sequelize);

// ── User ↔ Patient
User.hasOne(Patient, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  as: "patient",
});
Patient.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasOne(Doctor, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasOne(Doctor, {
  foreignKey: "user_id",
  onDelete: "CASCADE",
  as: "doctor",
});

Doctor.belongsTo(User, { foreignKey: "user_id" });
Doctor.belongsTo(User, { foreignKey: "user_id", as: "user" });

// ── Specialty ↔ Doctor ───────────────────────────────────────────────────────
Specialty.hasMany(Doctor, { foreignKey: "specialty_id" });
Doctor.belongsTo(Specialty, { foreignKey: "specialty_id" });

Doctor.belongsToMany(Clinic, {
  through: DoctorClinic,
  foreignKey: "doctor_id",
  otherKey: "clinic_id",
  as: "Clinics",
});
Clinic.belongsToMany(Doctor, {
  through: DoctorClinic,
  foreignKey: "clinic_id",
  otherKey: "doctor_id",
  as: "Doctors",
});

Doctor.hasMany(DoctorClinic, { foreignKey: "doctor_id", onDelete: "CASCADE" });
Clinic.hasMany(DoctorClinic, { foreignKey: "clinic_id", onDelete: "CASCADE" });
DoctorClinic.belongsTo(Doctor, { foreignKey: "doctor_id" });
DoctorClinic.belongsTo(Clinic, { foreignKey: "clinic_id" });

// ── Appointments ─────────────────────────────────────────────────────────────
Doctor.hasMany(Appointment, { foreignKey: "doctor_id" });
Patient.hasMany(Appointment, { foreignKey: "patient_id" });
Clinic.hasMany(Appointment, { foreignKey: "clinic_id" });
Appointment.belongsTo(Doctor, { foreignKey: "doctor_id" });
Appointment.belongsTo(Patient, { foreignKey: "patient_id" });
Appointment.belongsTo(Clinic, { foreignKey: "clinic_id" });

// ── Clinic ↔ Wilaya ──────────────────────────────────────────────────────────
// Two aliases: uppercase (admin) + lowercase (patient)
Clinic.belongsTo(Wilaya, { foreignKey: "wilaya_id", as: "Wilaya" });
Clinic.belongsTo(Wilaya, { foreignKey: "wilaya_id", as: "wilaya" });
Wilaya.hasMany(Clinic, { foreignKey: "wilaya_id", as: "Clinics" });
Wilaya.hasMany(Clinic, { foreignKey: "wilaya_id", as: "clinics" });

// ── Clinic ↔ Commune ─────────────────────────────────────────────────────────

Clinic.belongsTo(Commune, { foreignKey: "commune_id", as: "Commune" });
Clinic.belongsTo(Commune, { foreignKey: "commune_id", as: "commune" });
Commune.hasMany(Clinic, { foreignKey: "commune_id", as: "Clinics" });
Commune.hasMany(Clinic, { foreignKey: "commune_id", as: "clinics" });

// ── Plan → DoctorSubscription ────────────────────────────────────────────────
Plan.hasMany(DoctorSubscription, {
  foreignKey: "plan_id",
  as: "Subscriptions",
});
DoctorSubscription.belongsTo(Plan, { foreignKey: "plan_id", as: "Plan" });

// ── Doctor → DoctorSubscription ──────────────────────────────────────────────
Doctor.hasMany(DoctorSubscription, {
  foreignKey: "doctor_id",
  as: "Subscriptions",
});
DoctorSubscription.belongsTo(Doctor, { foreignKey: "doctor_id", as: "Doctor" });

// ── DoctorSubscription → SubscriptionPayment ─────────────────────────────────
DoctorSubscription.hasMany(SubscriptionPayment, {
  foreignKey: "subscription_id",
  as: "Payments",
});
SubscriptionPayment.belongsTo(DoctorSubscription, {
  foreignKey: "subscription_id",
});

// ── SubscriptionPayment → Doctor ─────────────────────────────────────────────
SubscriptionPayment.belongsTo(Doctor, { foreignKey: "doctor_id" });
SubscriptionPayment.belongsTo(Doctor, {
  foreignKey: "doctor_id",
  as: "doctor",
});

// ── SubscriptionPayment → Plan ───────────────────────────────────────────────
SubscriptionPayment.belongsTo(Plan, { foreignKey: "plan_id" });
SubscriptionPayment.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });

//SubscriptionPayment → User (admin recorder)
SubscriptionPayment.belongsTo(User, {
  foreignKey: "recorded_by",
  as: "RecordedBy",
});
//User → Assistant
User.hasOne(Assistant, { foreignKey: "user_id", as: "assistant" });
Assistant.belongsTo(User, { foreignKey: "user_id", as: "user" });

//Doctor → Assistant
Doctor.hasMany(Assistant, { foreignKey: "doctor_id", as: "assistants" });
Assistant.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });

// ── Doctor ↔ Patient

Doctor.hasMany(DoctorPatient, {
  foreignKey: "doctor_id",
  as: "doctorPatients",
});
DoctorPatient.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });

Patient.hasMany(DoctorPatient, {
  foreignKey: "patient_id",
  as: "doctorPatients",
});
DoctorPatient.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });

DoctorPatient.belongsTo(User, {
  foreignKey: "added_by_user_id",
  as: "addedBy",
});

module.exports = {
  sequelize,
  User,
  Patient,
  Doctor,
  Specialty,
  Clinic,
  DoctorClinic,
  Appointment,
  Wilaya,
  Commune,
  Plan,
  Assistant,
  DoctorPatient,
  DoctorSubscription,
  SubscriptionPayment,
  AuditLog,
};
