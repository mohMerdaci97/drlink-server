
const {
  User,
  Assistant,
  Doctor,
  Specialty,
  Appointment,
} = require("../../models");

exports.findByUserId = (userId) =>
  Assistant.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "phone", "email", "created_at"],
      },
      {
        model: Doctor,
        as: "doctor",
        attributes: [
          "id",
          "user_id",
          "description",
          "photo_url",
          "is_approved",
        ],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "full_name", "phone", "email"],
          },
          {
            model: Specialty,
            attributes: ["id", "name"],
          },
        ],
      },
    ],
  });

exports.findUserById = (userId) => User.findByPk(userId);

exports.findUserByPhoneExcludingId = (phone, userId) =>
  User.findOne({
    where: {
      phone,
      id: { [require("sequelize").Op.ne]: userId },
    },
  });

exports.findUserByEmailExcludingId = (email, userId) =>
  User.findOne({
    where: {
      email,
      id: { [require("sequelize").Op.ne]: userId },
    },
  });

exports.getAppointmentStats = async (doctorId) => {
  const [
    total,
    completed,
    cancelled,
    pending,
    confirmed,
    uniquePatients,
  ] = await Promise.all([
    Appointment.count({ where: { doctor_id: doctorId } }),
    Appointment.count({
      where: { doctor_id: doctorId, status: "completed" },
    }),
    Appointment.count({
      where: { doctor_id: doctorId, status: "cancelled" },
    }),
    Appointment.count({
      where: { doctor_id: doctorId, status: "pending" },
    }),
    Appointment.count({
      where: { doctor_id: doctorId, status: "confirmed" },
    }),
    Appointment.count({
      where: { doctor_id: doctorId },
      distinct: true,
      col: "patient_id",
    }),
  ]);

  return {
    total_appointments: total,
    completed,
    cancelled,
    pending,
    confirmed,
    unique_patients: uniquePatients,
    completion_rate: total
      ? Math.round((completed / total) * 100)
      : 0,
  };
};
