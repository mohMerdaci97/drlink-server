const {
  User,
  Patient,
  Doctor,
  Specialty,
  Clinic,
  Appointment,
  sequelize,
} = require("../../models");

const { Op, fn, col, literal } = require("sequelize");
const ROLES = require("../../constants/roles");

exports.getUserStats = async ({ thisMonth, lastMonth, lastMonthEnd }) => {
  const [
    totalUsers,
    totalDoctors,
    totalPatients,
    activeUsers,
    newUsersThisMonth,
    newUsersLastMonth,
  ] = await Promise.all([
    User.count(),

    User.count({
      where: {
        role: ROLES.DOCTOR,
      },
    }),

    User.count({
      where: {
        role: ROLES.PATIENT,
      },
    }),

    User.count({
      where: {
        is_active: true,
      },
    }),

    User.count({
      where: {
        created_at: {
          [Op.gte]: thisMonth,
        },
      },
    }),

    User.count({
      where: {
        created_at: {
          [Op.between]: [lastMonth, lastMonthEnd],
        },
      },
    }),
  ]);

  return {
    totalUsers,
    totalDoctors,
    totalPatients,
    activeUsers,
    newUsersThisMonth,
    newUsersLastMonth,
  };
};

exports.getDoctorStats = async () => {
  const [approvedDoctors, pendingDoctors] = await Promise.all([
    Doctor.count({
      where: {
        is_approved: true,
      },
    }),

    Doctor.count({
      where: {
        is_approved: false,
      },
    }),
  ]);

  const activeDoctors = await Doctor.count({
    include: [
      {
        model: User,
        where: {
          is_active: true,
        },
        attributes: [],
        required: true,
      },
    ],
  });

  const doctorsBySpecialty = await Doctor.findAll({
    where: {
      is_approved: true,
      specialty_id: {
        [Op.ne]: null,
      },
    },

    attributes: ["specialty_id", [fn("COUNT", col("Doctor.id")), "count"]],

    include: [
      {
        model: Specialty,
        attributes: ["name"],
        required: true,
      },
    ],

    group: ["Doctor.specialty_id", "Specialty.id", "Specialty.name"],

    order: [[literal("count"), "DESC"]],

    limit: 8,

    raw: true,
    nest: true,
  });

  return {
    approvedDoctors,
    pendingDoctors,
    activeDoctors,
    doctorsBySpecialty,
  };
};

exports.getPatientStats = async ({ thisMonth, lastMonth, lastMonthEnd }) => {
  const [newPatientsThisMonth, newPatientsLastMonth] = await Promise.all([
    User.count({
      where: {
        role: ROLES.PATIENT,
        created_at: {
          [Op.gte]: thisMonth,
        },
      },
    }),

    User.count({
      where: {
        role: ROLES.PATIENT,
        created_at: {
          [Op.between]: [lastMonth, lastMonthEnd],
        },
      },
    }),
  ]);

  const activePatients = await Patient.count({
    include: [
      {
        model: User,
        as: "user",
        where: {
          is_active: true,
        },
        attributes: [],
        required: true,
      },
    ],
  });

  const genderRows = await Patient.findAll({
    attributes: ["gender", [fn("COUNT", col("Patient.id")), "count"]],

    group: ["Patient.gender"],

    raw: true,
  });

  const genderMap = {};

  genderRows.forEach((row) => {
    genderMap[row.gender ?? "unknown"] = parseInt(row.count, 10);
  });

  return {
    newPatientsThisMonth,
    newPatientsLastMonth,
    activePatients,
    genderMap,
  };
};

exports.getAppointmentStats = async ({
  thisWeek,
  thisMonth,
  thisYear,
  lastMonth,
  lastMonthEnd,
  last6Months,
}) => {
  const [
    totalAppts,
    pendingAppts,
    confirmedAppts,
    completedAppts,
    cancelledAppts,
    apptThisWeek,
    apptThisMonth,
    apptThisYear,
    apptLastMonth,
  ] = await Promise.all([
    Appointment.count(),

    Appointment.count({
      where: {
        status: "pending",
      },
    }),

    Appointment.count({
      where: {
        status: "confirmed",
      },
    }),

    Appointment.count({
      where: {
        status: "completed",
      },
    }),

    Appointment.count({
      where: {
        status: "cancelled",
      },
    }),

    Appointment.count({
      where: {
        appointment_date: {
          [Op.gte]: thisWeek,
        },
      },
    }),

    Appointment.count({
      where: {
        appointment_date: {
          [Op.gte]: thisMonth,
        },
      },
    }),

    Appointment.count({
      where: {
        appointment_date: {
          [Op.gte]: thisYear,
        },
      },
    }),

    Appointment.count({
      where: {
        appointment_date: {
          [Op.between]: [lastMonth, lastMonthEnd],
        },
      },
    }),
  ]);

  const apptByMonth = await Appointment.findAll({
    attributes: [
      [fn("TO_CHAR", col("appointment_date"), "YYYY-MM"), "month"],

      [fn("COUNT", col("Appointment.id")), "count"],
    ],

    where: {
      appointment_date: {
        [Op.gte]: last6Months,
      },
    },

    group: [fn("TO_CHAR", col("appointment_date"), "YYYY-MM")],

    order: [[fn("TO_CHAR", col("appointment_date"), "YYYY-MM"), "ASC"]],

    raw: true,
  });

  const apptByDow = await Appointment.findAll({
    attributes: [
      [fn("EXTRACT", literal("DOW FROM appointment_date")), "dow"],

      [fn("COUNT", col("Appointment.id")), "count"],
    ],

    group: [fn("EXTRACT", literal("DOW FROM appointment_date"))],

    order: [[fn("EXTRACT", literal("DOW FROM appointment_date")), "ASC"]],

    raw: true,
  });

  const apptByHour = await Appointment.findAll({
    attributes: [
      [fn("EXTRACT", literal("HOUR FROM appointment_time")), "hour"],

      [fn("COUNT", col("Appointment.id")), "count"],
    ],

    group: [fn("EXTRACT", literal("HOUR FROM appointment_time"))],

    order: [[fn("EXTRACT", literal("HOUR FROM appointment_time")), "ASC"]],

    raw: true,
  });

  return {
    totalAppts,
    pendingAppts,
    confirmedAppts,
    completedAppts,
    cancelledAppts,
    apptThisWeek,
    apptThisMonth,
    apptThisYear,
    apptLastMonth,
    apptByMonth,
    apptByDow,
    apptByHour,
  };
};

exports.getClinicStats = async () => {
  const totalClinics = await Clinic.count();

  const topClinics = await Appointment.findAll({
    attributes: ["clinic_id", [fn("COUNT", col("Appointment.id")), "count"]],

    where: {
      clinic_id: {
        [Op.ne]: null,
      },
    },

    include: [
      {
        model: Clinic,
        attributes: ["id", "name"],
        required: true,
      },
    ],

    group: ["Appointment.clinic_id", "Clinic.id", "Clinic.name"],

    order: [[literal('"count"'), "DESC"]],

    limit: 5,

    raw: true,
    nest: true,
  });

  return {
    totalClinics,
    topClinics,
  };
};

exports.getSpecialtyStats = async () => {
  const totalSpecialties = await Specialty.count();

  const topSpecialties = await sequelize.query(
    `
      SELECT
        s.id        AS specialty_id,
        s.name      AS specialty_name,
        COUNT(a.id) AS appt_count
      FROM appointments a
      INNER JOIN doctors d
        ON a.doctor_id = d.id
      INNER JOIN specialties s
        ON d.specialty_id = s.id
      GROUP BY s.id, s.name
      ORDER BY appt_count DESC
      LIMIT 6
    `,
    {
      type: sequelize.QueryTypes.SELECT,
    },
  );

  return {
    totalSpecialties,
    topSpecialties,
  };
};
