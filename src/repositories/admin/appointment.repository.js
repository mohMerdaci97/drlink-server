const {
  Appointment,
  Doctor,
  Patient,
  User,
  Clinic,
  Specialty,
} = require("../../models");

const { Op } = require("sequelize");

function buildAdminAppointmentWhere(filters = {}) {
  const where = {};

  if (filters.doctor_id) {
    where.doctor_id = filters.doctor_id;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.date) {
    where.appointment_date = filters.date;
  } else if (filters.start_date && filters.end_date) {
    where.appointment_date = {
      [Op.between]: [filters.start_date, filters.end_date],
    };
  }

  return where;
}

async function getUserIdsByName(search) {
  if (!search?.trim()) {
    return [];
  }

  const term = `%${search.trim()}%`;

  const users = await User.findAll({
    where: {
      full_name: {
        [Op.iLike]: term,
      },
    },
    attributes: ["id"],
    raw: true,
  });

  return users.map((user) => user.id);
}

async function getPatientIdsByUserIds(userIds) {
  if (!userIds.length) {
    return [];
  }

  const patients = await Patient.findAll({
    where: {
      user_id: {
        [Op.in]: userIds,
      },
    },
    attributes: ["id"],
    raw: true,
  });

  return patients.map((patient) => patient.id);
}

async function getDoctorIdsByUserIds(userIds) {
  if (!userIds.length) {
    return [];
  }

  const doctors = await Doctor.findAll({
    where: {
      user_id: {
        [Op.in]: userIds,
      },
    },
    attributes: ["id"],
    raw: true,
  });

  return doctors.map((doctor) => doctor.id);
}

async function buildSearchFilter(search) {
  if (!search?.trim()) {
    return null;
  }

  const userIds = await getUserIdsByName(search);

  // No matching users means no appointment can match the search.
  if (!userIds.length) {
    return {
      [Op.or]: [
        {
          patient_id: {
            [Op.in]: [],
          },
        },
        {
          doctor_id: {
            [Op.in]: [],
          },
        },
      ],
    };
  }

  const [patientIds, doctorIds] = await Promise.all([
    getPatientIdsByUserIds(userIds),
    getDoctorIdsByUserIds(userIds),
  ]);

  return {
    [Op.or]: [
      {
        patient_id: {
          [Op.in]: patientIds,
        },
      },
      {
        doctor_id: {
          [Op.in]: doctorIds,
        },
      },
    ],
  };
}

async function buildAdminAppointmentWhereWithSearch(filters = {}) {
  const where = buildAdminAppointmentWhere(filters);

  const searchFilter = await buildSearchFilter(filters.search);

  if (searchFilter) {
    where[Op.or] = searchFilter[Op.or];
  }

  return where;
}

exports.findAdminAppointments = async ({ filters, pagination }) => {
  const where = await buildAdminAppointmentWhereWithSearch(filters);

  return Appointment.findAndCountAll({
    where,

    limit: pagination.limit,
    offset: pagination.offset,

    distinct: true,

    order: [["created_at", "DESC"]],

    attributes: [
      "id",
      "appointment_date",
      "appointment_time",
      "status",
      "created_at",
    ],

    include: [
      {
        model: Doctor,
        attributes: ["id"],

        include: [
          {
            model: User,
            attributes: ["id", "full_name", "phone", "email"],
          },
          {
            model: Specialty,
            attributes: ["id", "name"],
          },
        ],
      },

      {
        model: Patient,
        attributes: ["id", "user_id"],
        required: false,

        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "full_name", "phone", "email"],
            required: false,
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

exports.getAdminAppointmentStats = async (filters = {}) => {
  const where = await buildAdminAppointmentWhereWithSearch(filters);

  // Status must not restrict the statistics.
  delete where.status;

  const rows = await Appointment.findAll({
    where,

    attributes: [
      "status",
      [
        require("sequelize").fn("COUNT", require("sequelize").col("id")),
        "count",
      ],
    ],

    group: ["status"],

    raw: true,
  });

  const stats = {
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
  };

  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(stats, row.status)) {
      stats[row.status] = Number(row.count);
    }
  }

  return stats;
};
