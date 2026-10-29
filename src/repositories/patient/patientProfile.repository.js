const { Op, fn, col, where: sqlWhere } = require("sequelize");
const {
  User,
  Patient,
  Appointment,
  Commune,
  RefreshToken,
} = require("../../models");
const { ACTIVE_STATUSES, STATUS } = require("../../constants/appointment");

// Patient and user

exports.findPatientWithUser = async (userId) => {
  return Patient.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "email", "phone", "is_active", "created_at"],
      },
    ],
  });
};

exports.findPatientByUserId = async (userId) => {
  return Patient.findOne({ where: { user_id: userId } });
};

// Full row, with password_hash
exports.findUserWithPassword = async (userId) => {
  return User.findByPk(userId);
};

// Email is compared in lower case (old rows may have capitals)
exports.findUserByEmail = async (email) => {
  return User.findOne({
    where: sqlWhere(fn("LOWER", col("email")), email),
  });
};

exports.updateUser = async (user, data, options = {}) => {
  return user.update(data, options);
};

exports.updatePatient = async (patient, data, options = {}) => {
  return patient.update(data, options);
};

exports.findCommune = async (communeId) => {
  return Commune.findByPk(communeId, { attributes: ["id", "wilaya_id"] });
};

// Appointments 

// Returns [{ status: "completed", count: "3" }, ...]
exports.countAppointmentsByStatus = async (patientId) => {
  return Appointment.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    where: { patient_id: patientId },
    group: ["status"],
    raw: true,
  });
};

exports.countUpcomingAppointments = async ({ patientId, today, nowTime }) => {
  return Appointment.count({
    where: {
      patient_id: patientId,
      status: { [Op.in]: ACTIVE_STATUSES },
      [Op.or]: [
        { appointment_date: { [Op.gt]: today } },
        { appointment_date: today, appointment_time: { [Op.gte]: nowTime } },
      ],
    },
  });
};

exports.cancelActiveAppointments = async (patientId, transaction) => {
  return Appointment.update(
    { status: STATUS.CANCELLED },
    {
      where: { patient_id: patientId, status: { [Op.in]: ACTIVE_STATUSES } },
      transaction,
    },
  );
};

// Sessions 

// Close every session except the one with keepHash
exports.revokeOtherRefreshTokens = async ({ userId, keepHash, transaction }) => {
  const where = { user_id: userId, revoked_at: null };

  if (keepHash) where.token_hash = { [Op.ne]: keepHash };

  return RefreshToken.update({ revoked_at: new Date() }, { where, transaction });
};

exports.revokeAllRefreshTokens = async (userId, transaction) => {
  return RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null }, transaction },
  );
};