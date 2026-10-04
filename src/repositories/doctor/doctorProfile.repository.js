const {
  User,
  Doctor,
  Specialty,
  Appointment,
  DoctorClinic,
} = require("../../models");

const { Op } = require("sequelize");

/* DOCTOR */

exports.findDoctorWithProfile = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
    include: [
      {
        model: User,
        attributes: ["id", "full_name", "phone", "email", "created_at"],
      },
      {
        model: Specialty,
        attributes: ["id", "name"],
      },
    ],
  });
};

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
  });
};

exports.updateDoctor = async (doctor, data) => {
  return doctor.update(data);
};

/* USER*/

exports.findUserById = async (userId) => {
  return User.findByPk(userId);
};

exports.findUserByPhone = async (phone, userId) => {
  return User.findOne({
    where: {
      phone,
      id: {
        [Op.ne]: userId,
      },
    },
  });
};

exports.findUserByEmail = async (email, userId) => {
  return User.findOne({
    where: {
      email,
      id: {
        [Op.ne]: userId,
      },
    },
  });
};

exports.updateUser = async (user, data) => {
  return user.update(data);
};

/*  PROFILE STATS */

exports.countAppointments = async (doctorId, where = {}) => {
  return Appointment.count({
    where: {
      doctor_id: doctorId,
      ...where,
    },
  });
};

exports.countUniquePatients = async (doctorId) => {
  return Appointment.count({
    where: {
      doctor_id: doctorId,
    },
    distinct: true,
    col: "patient_id",
  });
};

exports.countClinics = async (doctorId) => {
  return DoctorClinic.count({
    where: {
      doctor_id: doctorId,
    },
    distinct: true,
    col: "clinic_id",
  });
};
