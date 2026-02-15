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

/* relations */
User.hasOne(Patient, { foreignKey: "user_id" });
Patient.belongsTo(User, { foreignKey: "user_id" });

User.hasOne(Doctor, { foreignKey: "user_id" });
Doctor.belongsTo(User, { foreignKey: "user_id" });

Specialty.hasMany(Doctor, { foreignKey: "specialty_id" });
Doctor.belongsTo(Specialty, { foreignKey: "specialty_id" });

Doctor.belongsToMany(Clinic, {
  through: DoctorClinic,
  foreignKey: "doctor_id",
});
Clinic.belongsToMany(Doctor, {
  through: DoctorClinic,
  foreignKey: "clinic_id",
});

Doctor.hasMany(Appointment, { foreignKey: "doctor_id" });
Patient.hasMany(Appointment, { foreignKey: "patient_id" });
Clinic.hasMany(Appointment, { foreignKey: "clinic_id" });

Appointment.belongsTo(Doctor, { foreignKey: "doctor_id" });
Appointment.belongsTo(Patient, { foreignKey: "patient_id" });
Appointment.belongsTo(Clinic, { foreignKey: "clinic_id" });
Wilaya.hasMany(Clinic, { foreignKey: "wilaya_id" });
Commune.hasMany(Clinic, { foreignKey: "commune_id" });

Clinic.belongsTo(Wilaya, { foreignKey: "wilaya_id" });
Clinic.belongsTo(Commune, { foreignKey: "commune_id" });

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
