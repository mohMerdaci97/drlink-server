const {
  Doctor,
  User,
  Specialty,
  Clinic,
  DoctorClinic,
  Wilaya,
  Commune,
} = require("../../models");

exports.findAll = async ({ limit, offset }) => {
  return Doctor.findAndCountAll({
    limit,
    offset,

    order: [["created_at", "DESC"]],

    include: [
      {
        model: User,
        attributes: ["email", "full_name", "is_active"],
      },
      {
        model: Specialty,
      },
    ],
  });
};

exports.findById = async (doctorId) => {
  return Doctor.findByPk(doctorId);
};

exports.findByIdWithUser = async (doctorId) => {
  return Doctor.findByPk(doctorId, {
    include: [
      {
        model: User,
      },
    ],
  });
};

exports.findAdminDetails = async (doctorId) => {
  return Doctor.findByPk(doctorId, {
    include: [
      {
        model: User,
        attributes: [
          "id",
          "full_name",
          "email",
          "phone",
          "onboarding_status",
          "is_active",
        ],
      },

      {
        model: Specialty,
        attributes: ["id", "name"],
      },

      {
        model: Clinic,
        as: "Clinics",
        attributes: ["id", "name", "address"],

        include: [
          {
            model: Wilaya,
            as: "Wilaya",
            attributes: ["id", "name_fr"],
          },

          {
            model: Commune,
            as: "Commune",
            attributes: ["id", "name_fr"],
          },
        ],
      },

      {
        model: DoctorClinic,
        attributes: ["clinic_id", "day_of_week", "start_time", "end_time"],
      },
    ],
  });
};

exports.create = async (data, options = {}) => {
  return Doctor.create(data, options);
};

exports.update = async (doctor, data, options = {}) => {
  return doctor.update(data, options);
};
