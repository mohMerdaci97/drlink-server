const { Doctor, Appointment, Patient, User, Clinic } = require("../../models");

const { Op, fn, col, literal } = require("sequelize");

/*  DOCTOR
 */

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
  });
};

/* PATIENT LIST*/

exports.findPatientStats = async ({ doctorId, search }) => {
  const appointmentWhere = {
    doctor_id: doctorId,
  };

  const userInclude = {
    model: User,

    as: "user",

    attributes: ["id", "full_name", "phone", "email"],
  };

  if (search?.trim()) {
    userInclude.where = {
      full_name: {
        [Op.iLike]: `%${search.trim()}%`,
      },
    };
  }

  return Appointment.findAll({
    where: appointmentWhere,

    attributes: [
      "patient_id",

      [fn("COUNT", col("Appointment.id")), "total_appointments"],

      [fn("MAX", col("appointment_date")), "last_date"],

      [
        fn("SUM", literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")),
        "completed_count",
      ],

      [
        fn("SUM", literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")),
        "cancelled_count",
      ],
    ],

    group: ["patient_id", "Patient.id", "Patient->user.id"],

    include: [
      {
        model: Patient,

        attributes: ["id", "gender", "date_of_birth"],

        include: [userInclude],
      },
    ],

    order: [[literal('"last_date"'), "DESC"]],

    raw: false,
  });
};

/* =========================================================
   PATIENT ACCESS
========================================================= */

exports.countPatientAppointments = async ({ doctorId, patientId }) => {
  return Appointment.count({
    where: {
      doctor_id: doctorId,
      patient_id: patientId,
    },
  });
};

exports.findPatientById = async (patientId) => {
  return Patient.findByPk(patientId, {
    include: [
      {
        model: User,

        as: "user",

        attributes: ["id", "full_name", "phone", "email", "created_at"],
      },
    ],
  });
};

/* =========================================================
   APPOINTMENT HISTORY
========================================================= */

exports.findPatientAppointments = async ({ doctorId, patientId }) => {
  return Appointment.findAll({
    where: {
      doctor_id: doctorId,
      patient_id: patientId,
    },

    order: [
      ["appointment_date", "DESC"],
      ["appointment_time", "DESC"],
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
        model: Clinic,

        attributes: ["id", "name", "address"],
      },
    ],
  });
};
