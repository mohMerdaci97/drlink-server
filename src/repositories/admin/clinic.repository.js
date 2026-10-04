const {
  Clinic,
  Wilaya,
  Commune,
  DoctorClinic,
  Doctor,
  User,
  Appointment,
} = require("../../models");

const { Op, fn, col } = require("sequelize");

exports.findAllAdmin = async ({ search, wilaya_id }) => {
  const where = {};

  if (search?.trim()) {
    where.name = {
      [Op.iLike]: `%${search.trim()}%`,
    };
  }

  if (wilaya_id) {
    where.wilaya_id = wilaya_id;
  }

  const clinics = await Clinic.findAll({
    where,

    attributes: [
      "id",
      "name",
      "address",
      "phone",
      "wilaya_id",
      "commune_id",
      "is_private",
      "created_by_doctor_id",
      "created_at",
      "latitude",
      "longitude",
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

    order: [
      ["is_private", "ASC"],
      ["name", "ASC"],
    ],
  });

  if (!clinics.length) {
    return [];
  }

  const ids = clinics.map((clinic) => clinic.id);

  const [doctorCounts, appointmentCounts] = await Promise.all([
    DoctorClinic.findAll({
      where: {
        clinic_id: {
          [Op.in]: ids,
        },
      },

      attributes: [
        "clinic_id",
        [fn("COUNT", fn("DISTINCT", col("doctor_id"))), "doctor_count"],
      ],

      group: ["clinic_id"],

      raw: true,
    }),

    Appointment.findAll({
      where: {
        clinic_id: {
          [Op.in]: ids,
        },
      },

      attributes: ["clinic_id", [fn("COUNT", col("id")), "appt_count"]],

      group: ["clinic_id"],

      raw: true,
    }),
  ]);

  const doctorMap = Object.fromEntries(
    doctorCounts.map((row) => [row.clinic_id, Number(row.doctor_count)]),
  );

  const appointmentMap = Object.fromEntries(
    appointmentCounts.map((row) => [row.clinic_id, Number(row.appt_count)]),
  );

  return clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    address: clinic.address,
    phone: clinic.phone,

    wilaya_id: clinic.wilaya_id,
    commune_id: clinic.commune_id,

    wilaya: clinic.Wilaya?.name_fr ?? null,
    wilaya_code: clinic.Wilaya?.code ?? null,
    commune: clinic.Commune?.name_fr ?? null,

    is_private: clinic.is_private,
    created_by_doctor_id: clinic.created_by_doctor_id,

    created_at: clinic.created_at,

    latitude: clinic.latitude != null ? Number(clinic.latitude) : null,

    longitude: clinic.longitude != null ? Number(clinic.longitude) : null,

    doctor_count: doctorMap[clinic.id] ?? 0,

    appt_count: appointmentMap[clinic.id] ?? 0,
  }));
};

exports.findAdminDetails = async (clinicId) => {
  const clinic = await Clinic.findByPk(clinicId, {
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
  });

  if (!clinic) {
    return null;
  }

  const schedules = await DoctorClinic.findAll({
    where: {
      clinic_id: clinic.id,
    },

    include: [
      {
        model: Doctor,

        include: [
          {
            model: User,
            attributes: ["full_name", "phone", "email"],
          },
        ],
      },
    ],

    order: [["doctor_id", "ASC"]],
  });

  const doctorMap = {};

  for (const row of schedules) {
    const doctorId = row.doctor_id;

    if (!doctorMap[doctorId]) {
      doctorMap[doctorId] = {
        doctor_id: doctorId,

        full_name: row.Doctor?.User?.full_name ?? "—",

        phone: row.Doctor?.User?.phone ?? null,

        email: row.Doctor?.User?.email ?? null,

        schedule: [],
      };
    }

    doctorMap[doctorId].schedule.push({
      day: row.day_of_week,

      start_time: row.start_time?.slice(0, 5) ?? null,

      end_time: row.end_time?.slice(0, 5) ?? null,
    });
  }

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,

      wilaya_id: clinic.wilaya_id,
      commune_id: clinic.commune_id,

      wilaya: clinic.Wilaya?.name_fr ?? null,

      commune: clinic.Commune?.name_fr ?? null,

      is_private: clinic.is_private,
      created_at: clinic.created_at,

      latitude: clinic.latitude != null ? Number(clinic.latitude) : null,

      longitude: clinic.longitude != null ? Number(clinic.longitude) : null,
    },

    doctors: Object.values(doctorMap),
  };
};

exports.findById = async (clinicId) => {
  return Clinic.findByPk(clinicId);
};

exports.createAdmin = async (data) => {
  return Clinic.create({
    ...data,
    is_private: false,
    created_by_doctor_id: null,
  });
};

exports.update = async (clinic, updates) => {
  await clinic.update(updates);
  return clinic;
};

exports.countActiveAppointments = async (clinicId) => {
  return Appointment.count({
    where: {
      clinic_id: clinicId,

      status: {
        [Op.in]: ["pending", "confirmed"],
      },
    },
  });
};

exports.remove = async (clinic) => {
  await clinic.destroy();
};
