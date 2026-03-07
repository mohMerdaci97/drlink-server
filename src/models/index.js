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

// User ↔ Patient
User.hasOne(Patient, { foreignKey: "user_id", onDelete: "CASCADE" });
Patient.belongsTo(User, { foreignKey: "user_id" });

// User ↔ Doctor
User.hasOne(Doctor, { foreignKey: "user_id", onDelete: "CASCADE" });
Doctor.belongsTo(User, { foreignKey: "user_id" });

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

Doctor.hasMany(DoctorClinic, {
  foreignKey: "doctor_id",
  onDelete: "CASCADE",
});

Clinic.hasMany(DoctorClinic, {
  foreignKey: "clinic_id",
  onDelete: "CASCADE",
});

DoctorClinic.belongsTo(Doctor, { foreignKey: "doctor_id" });
DoctorClinic.belongsTo(Clinic, { foreignKey: "clinic_id" });

Doctor.hasMany(Appointment, { foreignKey: "doctor_id" });
Patient.hasMany(Appointment, { foreignKey: "patient_id" });
Clinic.hasMany(Appointment, { foreignKey: "clinic_id" });

Appointment.belongsTo(Doctor, { foreignKey: "doctor_id" });
Appointment.belongsTo(Patient, { foreignKey: "patient_id" });
Appointment.belongsTo(Clinic, { foreignKey: "clinic_id" });

Wilaya.hasMany(Clinic, {
  foreignKey: "wilaya_id",
  as: "Clinics",
});

Commune.hasMany(Clinic, {
  foreignKey: "commune_id",
  as: "Clinics",
});

Clinic.belongsTo(Wilaya, {
  foreignKey: "wilaya_id",
  as: "Wilaya",
});

Clinic.belongsTo(Commune, {
  foreignKey: "commune_id",
  as: "Commune",
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
};
