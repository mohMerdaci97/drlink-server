const { Op, fn, col } = require("sequelize");
const {
  sequelize,
  Doctor,
  User,
  Specialty,
  Clinic,
  DoctorClinic,
  Appointment,
  Patient,
  Wilaya,
  Commune,
} = require("../../models");
const { ACTIVE_STATUSES, STATUS } = require("../../constants/appointment");

const nameField = (lang) => (lang === "fr" ? "name_fr" : "name_ar");

// Escape % and _ so user text is searched literally
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

const locationIncludes = (lang) => [
  { model: Wilaya, as: "wilaya", attributes: ["id", nameField(lang)] },
  { model: Commune, as: "commune", attributes: ["id", nameField(lang)] },
];

const activeUserInclude = {
  model: User,
  as: "user",
  attributes: [],
  where: { is_active: true },
  required: true,
};

const SORTS = {
  name: [
    [{ model: User, as: "user" }, "full_name", "ASC"],
    ["id", "ASC"],
  ],
  newest: [["id", "DESC"]],
};

// ── Search ──────────────────────────────────────────

// Doctor ids that work in clinics matching the filters. null = no clinic filter.
exports.findDoctorIdsByClinicFilter = async ({
  wilayaId,
  communeId,
  workingDay,
}) => {
  if (!wilayaId && !communeId && !workingDay) return null;

  const scheduleWhere = {};

  if (wilayaId || communeId) {
    const clinicWhere = {};
    if (wilayaId) clinicWhere.wilaya_id = wilayaId;
    if (communeId) clinicWhere.commune_id = communeId;

    const clinics = await Clinic.findAll({
      where: clinicWhere,
      attributes: ["id"],
      raw: true,
    });

    scheduleWhere.clinic_id = { [Op.in]: clinics.map((c) => c.id) };
  }

  if (workingDay) scheduleWhere.day_of_week = workingDay;

  const rows = await DoctorClinic.findAll({
    where: scheduleWhere,
    attributes: ["doctor_id"],
    group: ["doctor_id"],
    raw: true,
  });

  return rows.map((r) => r.doctor_id);
};

// One page of doctor ids (details are loaded after)
exports.findDoctorPage = async ({
  doctorIds,
  specialtyId,
  search,
  sort,
  limit,
  offset,
}) => {
  const where = { is_approved: true };

  if (specialtyId) where.specialty_id = specialtyId;
  if (doctorIds) where.id = { [Op.in]: doctorIds };

  if (search) {
    const like = `%${escapeLike(search)}%`;

    where[Op.or] = [
      { "$user.full_name$": { [Op.iLike]: like } },
      { "$Specialty.name$": { [Op.iLike]: like } },
    ];
  }

  return Doctor.findAndCountAll({
    where,
    attributes: ["id"],
    include: [
      activeUserInclude,
      { model: Specialty, attributes: [], required: false },
    ],
    order: sort === "newest" ? SORTS.newest : SORTS.name,
    limit,
    offset,
  });
};

exports.findDoctorsWithClinics = async ({ ids, lang }) => {
  return Doctor.findAll({
    where: { id: { [Op.in]: ids } },
    include: [
      { model: User, as: "user", attributes: ["id", "full_name"] },
      { model: Specialty, attributes: ["id", "name"] },
      {
        model: Clinic,
        as: "Clinics",
        attributes: [
          "id",
          "name",
          "address",
          "photo_url",
          "latitude",
          "longitude",
          "wilaya_id",
        ],
        through: { attributes: [] },
        include: locationIncludes(lang),
      },
    ],
  });
};

exports.findDoctorsBasic = async (ids) => {
  return Doctor.findAll({
    where: { id: { [Op.in]: ids } },
    include: [
      { model: User, as: "user", attributes: ["id", "full_name"] },
      { model: Specialty, attributes: ["id", "name"] },
    ],
  });
};

// ── Doctor detail and slots ─────────────────────────

exports.findDoctorById = async (id, lang) => {
  return Doctor.findOne({
    where: { id, is_approved: true },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["full_name"],
        where: { is_active: true },
        required: true,
      },
      { model: Specialty, attributes: ["id", "name"] },
      {
        model: Clinic,
        as: "Clinics",
        attributes: [
          "id",
          "name",
          "address",
          "phone",
          "photo_url",
          "latitude",
          "longitude",
        ],
        through: { attributes: [] },
        include: locationIncludes(lang),
      },
    ],
  });
};

exports.findBookableDoctor = async (id) => {
  return Doctor.findOne({
    where: { id, is_approved: true },
    attributes: ["id", "slot_duration"],
    include: [activeUserInclude],
  });
};

exports.findSchedules = async (doctorId, clinicId) => {
  return DoctorClinic.findAll({
    where: { doctor_id: doctorId, clinic_id: clinicId },
    attributes: ["day_of_week", "start_time", "end_time"],
    raw: true,
  });
};

exports.findSchedulesByDoctorIds = async (doctorIds) => {
  return DoctorClinic.findAll({
    where: { doctor_id: { [Op.in]: doctorIds } },
    attributes: [
      "doctor_id",
      "clinic_id",
      "day_of_week",
      "start_time",
      "end_time",
    ],
    raw: true,
  });
};

exports.findBookedByDoctorIds = async ({ doctorIds, from, to }) => {
  return Appointment.findAll({
    where: {
      doctor_id: { [Op.in]: doctorIds },
      appointment_date: { [Op.between]: [from, to] },
      status: { [Op.in]: ACTIVE_STATUSES },
    },
    attributes: ["doctor_id", "appointment_date", "appointment_time"],
    raw: true,
  });
};

// ── Patient history with a doctor ───────────────────

exports.findPatientByUserId = async (userId) => {
  return Patient.findOne({ where: { user_id: userId } });
};

exports.countCompletedWithDoctor = async (patientId, doctorId) => {
  return Appointment.count({
    where: {
      patient_id: patientId,
      doctor_id: doctorId,
      status: STATUS.COMPLETED,
    },
  });
};

exports.findUpcomingWithDoctor = async ({
  patientId,
  doctorId,
  today,
  nowTime,
}) => {
  return Appointment.findOne({
    where: {
      patient_id: patientId,
      doctor_id: doctorId,
      status: { [Op.in]: ACTIVE_STATUSES },
      [Op.or]: [
        { appointment_date: { [Op.gt]: today } },
        { appointment_date: today, appointment_time: { [Op.gte]: nowTime } },
      ],
    },
    order: [
      ["appointment_date", "ASC"],
      ["appointment_time", "ASC"],
    ],
  });
};

// ── Nearby ──────────────────────────────────────────

exports.findClinicsInRadius = async ({
  latitude,
  longitude,
  radiusKm,
  lang,
  limit,
}) => {
  // Number() makes these values safe to put inside the SQL text
  const lat = Number(latitude);
  const lng = Number(longitude);
  const radius = Number(radiusKm);

  // LEAST/GREATEST keep acos input in [-1, 1] (rounding can push it out)
  const distance = `6371 * acos(LEAST(1, GREATEST(-1,
    cos(radians(${lat})) * cos(radians("Clinic"."latitude")) *
    cos(radians("Clinic"."longitude") - radians(${lng})) +
    sin(radians(${lat})) * sin(radians("Clinic"."latitude"))
  )))`;

  // Cheap box filter first, exact distance second
  const latDelta = radius / 111;
  const lngDelta =
    radius / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  return Clinic.findAll({
    attributes: [
      "id",
      "name",
      "address",
      "photo_url",
      "latitude",
      "longitude",
      "wilaya_id",
      [sequelize.literal(distance), "distance_km"],
    ],
    where: {
      latitude: { [Op.between]: [lat - latDelta, lat + latDelta] },
      longitude: { [Op.between]: [lng - lngDelta, lng + lngDelta] },
      [Op.and]: sequelize.literal(`${distance} <= ${radius}`),
    },
    include: [
      {
        model: Wilaya,
        as: "wilaya",
        attributes: ["id", nameField(lang)],
        required: false,
      },
    ],
    order: sequelize.literal('"distance_km" ASC'),
    limit,
  });
};

exports.findDoctorClinicLinks = async (clinicIds) => {
  return DoctorClinic.findAll({
    where: { clinic_id: { [Op.in]: clinicIds } },
    attributes: ["doctor_id", "clinic_id"],
    group: ["doctor_id", "clinic_id"],
    raw: true,
  });
};

// ── Lists ───────────────────────────────────────────

exports.findSpecialties = async () => {
  return Specialty.findAll({
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
  });
};

exports.findSpecialtiesByName = async (text, limit) => {
  return Specialty.findAll({
    where: { name: { [Op.iLike]: `%${escapeLike(text)}%` } },
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
    limit,
  });
};

// Approved doctors with an active account, per specialty
exports.countDoctorsBySpecialty = async () => {
  return Doctor.findAll({
    attributes: ["specialty_id", [fn("COUNT", col("Doctor.id")), "count"]],
    where: { is_approved: true },
    include: [activeUserInclude],
    group: ["Doctor.specialty_id"],
    raw: true,
  });
};

exports.findWilayas = async (lang) => {
  return Wilaya.findAll({
    attributes: ["id", "code", nameField(lang)],
    order: [["id", "ASC"]],
  });
};

exports.findCommunes = async (wilayaId, lang) => {
  return Commune.findAll({
    where: { wilaya_id: wilayaId },
    attributes: ["id", nameField(lang)],
    order: [[nameField(lang), "ASC"]],
  });
};
