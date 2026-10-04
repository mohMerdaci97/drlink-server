const { Appointment, Patient, User, Clinic, Doctor } = require("../../models");
const { Op } = require("sequelize");

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: { user_id: userId },
  });
};

exports.findPatientsByUserName = async (term) => {
  const users = await User.findAll({
    where: {
      full_name: {
        [Op.iLike]: `%${term}%`,
      },
    },
    attributes: ["id"],
  });

  const userIds = users.map((user) => user.id);

  if (!userIds.length) return [];

  const patients = await Patient.findAll({
    where: {
      user_id: {
        [Op.in]: userIds,
      },
    },
    attributes: ["id"],
  });

  return patients.map((patient) => patient.id);
};

exports.findAndCountAll = async ({ where, limit, offset }) => {
  return Appointment.findAndCountAll({
    where,
    limit,
    offset,
    distinct: true,
    order: [
      ["appointment_date", "ASC"],
      ["appointment_time", "ASC"],
    ],
    attributes: [
      "id",
      "appointment_date",
      "appointment_time",
      "status",
      "created_at",
    ],
    include: [
      {
        model: Patient,
        attributes: ["id"],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "full_name", "phone", "email"],
          },
        ],
      },
      {
        model: Clinic,
        attributes: ["id", "name", "address", "phone"],
      },
    ],
  });
};

exports.countByStatus = async ({ doctorId, date, status }) => {
  const where = {
    doctor_id: doctorId,
    status,
  };

  if (date) {
    where.appointment_date = date;
  }

  return Appointment.count({ where });
};

exports.findToday = async (doctorId, date) => {
  return Appointment.findAll({
    where: {
      doctor_id: doctorId,
      appointment_date: date,
    },
    order: [["appointment_time", "ASC"]],
    attributes: ["id", "appointment_date", "appointment_time", "status"],
    include: [
      {
        model: Patient,
        attributes: ["id"],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "full_name", "phone"],
          },
        ],
      },
      {
        model: Clinic,
        attributes: ["id", "name"],
      },
    ],
  });
};

exports.findByIdForDoctor = async (appointmentId, doctorId) => {
  return Appointment.findOne({
    where: {
      id: appointmentId,
      doctor_id: doctorId,
    },
  });
};

exports.updateStatus = async (appointment, status) => {
  appointment.status = status;
  return appointment.save();
};
