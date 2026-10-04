const {
  Doctor,
  DoctorClinic,
  Clinic,
  Wilaya,
  Commune,
} = require("../../models");

const { Op } = require("sequelize");

/* =========================================================
   DOCTOR
========================================================= */

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
  });
};

/* =========================================================
   CLINICS
========================================================= */

exports.findDoctorClinics = async (doctorId) => {
  return DoctorClinic.findAll({
    where: {
      doctor_id: doctorId,
    },

    include: [
      {
        model: Clinic,

        attributes: [
          "id",
          "name",
          "address",
          "phone",
          "wilaya_id",
          "commune_id",
          "is_private",
          "created_by_doctor_id",
          "latitude",
          "longitude",
          "photo",
        ],

        include: [
          {
            model: Wilaya,
            as: "Wilaya",
            attributes: ["id", "name_fr", "code"],
          },

          {
            model: Commune,
            as: "Commune",
            attributes: ["id", "name_fr"],
          },
        ],
      },
    ],

    order: [["clinic_id", "ASC"]],
  });
};

exports.findLinkedClinicIds = async (doctorId) => {
  const rows = await DoctorClinic.findAll({
    where: {
      doctor_id: doctorId,
    },
    attributes: ["clinic_id"],
  });

  return [...new Set(rows.map((row) => row.clinic_id))];
};

exports.findAvailableClinics = async ({
  doctorId,
  search,
}) => {
  const where = {};

  if (search?.trim()) {
    where.name = {
      [Op.iLike]: `%${search.trim()}%`,
    };
  }

  return Clinic.findAll({
    where: {
      ...where,

      [Op.or]: [
        {
          is_private: false,
        },

        {
          is_private: true,
          created_by_doctor_id: doctorId,
        },
      ],
    },

    attributes: [
      "id",
      "name",
      "address",
      "phone",
      "is_private",
      "created_by_doctor_id",
      "latitude",
      "longitude",
      "photo",
    ],

    include: [
      {
        model: Wilaya,
        as: "Wilaya",
        attributes: ["name_fr", "code"],
      },

      {
        model: Commune,
        as: "Commune",
        attributes: ["name_fr"],
      },
    ],

    order: [
      [
        Clinic.sequelize.literal(
          `CASE WHEN created_by_doctor_id = ${Number(doctorId)} THEN 0 ELSE 1 END`,
        ),
        "ASC",
      ],
      ["name", "ASC"],
    ],

    limit: 30,
  });
};

exports.findClinicById = async (clinicId) => {
  return Clinic.findByPk(clinicId);
};

exports.findOwnPrivateClinic = async (clinicId, doctorId) => {
  return Clinic.findOne({
    where: {
      id: clinicId,
      created_by_doctor_id: doctorId,
      is_private: true,
    },
  });
};

exports.createClinic = async (data) => {
  return Clinic.create(data);
};

exports.updateClinic = async (clinic, data) => {
  return clinic.update(data);
};

exports.deleteClinic = async (clinic) => {
  return clinic.destroy();
};

/* =========================================================
   DOCTOR ↔ CLINIC
========================================================= */

exports.findDoctorClinicLink = async (doctorId, clinicId) => {
  return DoctorClinic.findOne({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
    },
  });
};

exports.createDoctorClinicLink = async (data) => {
  return DoctorClinic.create(data);
};

exports.deleteDoctorClinicLink = async (doctorId, clinicId) => {
  return DoctorClinic.destroy({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
    },
  });
};

exports.countClinicDoctors = async (clinicId) => {
  return DoctorClinic.count({
    where: {
      clinic_id: clinicId,
    },
  });
};

/* =========================================================
   SCHEDULES
========================================================= */

exports.findScheduleByIdForDoctor = async (
  scheduleId,
  doctorId,
) => {
  return DoctorClinic.findOne({
    where: {
      id: scheduleId,
      doctor_id: doctorId,
    },
  });
};

exports.findScheduleByDay = async ({
  doctorId,
  clinicId,
  dayOfWeek,
}) => {
  return DoctorClinic.findOne({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
      day_of_week: dayOfWeek,
    },
  });
};

exports.findScheduleByDayExcept = async ({
  doctorId,
  clinicId,
  dayOfWeek,
  scheduleId,
}) => {
  return DoctorClinic.findOne({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
      day_of_week: dayOfWeek,

      id: {
        [Op.ne]: scheduleId,
      },
    },
  });
};

exports.createSchedule = async (data) => {
  return DoctorClinic.create(data);
};

exports.updateSchedule = async (schedule, data) => {
  return schedule.update(data);
};

exports.deleteSchedule = async (schedule) => {
  return schedule.destroy();
};