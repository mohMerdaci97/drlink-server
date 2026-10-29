const { Op, fn, col } = require("sequelize");
const {
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

const nameField = (lang) => (lang === "fr" ? "name_fr" : "name_ar");

const locationIncludes = (lang) => [
  {
    model: Wilaya,
    as: "wilaya",
    attributes: ["id", nameField(lang)],
  },
  {
    model: Commune,
    as: "commune",
    attributes: ["id", nameField(lang)],
  },
];

// ── PATIENT ─────────────────────────────────────────

exports.findPatientByUserId = async (userId) => {
  return Patient.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["full_name"],
      },
    ],
  });
};

// STATS 

exports.countApprovedDoctors = async () => {
  return Doctor.count({
    where: { is_approved: true },
    include: [
      {
        model: User,
        as: "user",
        attributes: [],
        where: { is_active: true },
        required: true,
      },
    ],
  });
};

exports.countSpecialties = async () => Specialty.count();

exports.countClinics = async () => Clinic.count();

exports.countPatients = async () => Patient.count();

/**
 * Nombre de rendez-vous du patient par statut.
 * Retourne [{ status: "pending", count: "2" }, ...]
 */
exports.countAppointmentsByStatus = async (patientId) => {
  return Appointment.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    where: { patient_id: patientId },
    group: ["status"],
    raw: true,
  });
};

/**
 * Nombre de médecins approuvés par spécialité.
 * Retourne [{ specialty_id: 1, count: "4" }, ...]
 */
exports.countDoctorsBySpecialty = async () => {
  return Doctor.findAll({
    attributes: ["specialty_id", [fn("COUNT", col("Doctor.id")), "count"]],
    where: { is_approved: true },
    group: ["specialty_id"],
    raw: true,
  });
};

/**
 * Nombre de médecins distincts par clinique pour une liste de cliniques.
 * Retourne [{ clinic_id: 3, count: "5" }, ...]
 */
exports.countDoctorsByClinicIds = async (clinicIds) => {
  if (!clinicIds.length) return [];

  return DoctorClinic.findAll({
    attributes: ["clinic_id", [fn("COUNT", fn("DISTINCT", col("doctor_id"))), "count"]],
    where: { clinic_id: { [Op.in]: clinicIds } },
    group: ["clinic_id"],
    raw: true,
  });
};

// ── CATALOGUE ───────────────────────────────────────

exports.findSpecialties = async ({ limit }) => {
  return Specialty.findAll({
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
    limit,
  });
};

exports.findFeaturedDoctors = async ({ lang, limit }) => {
  return Doctor.findAll({
    where: { is_approved: true },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name"],
        where: { is_active: true },
        required: true,
      },
      {
        model: Specialty,
        attributes: ["id", "name"],
      },
      {
        model: Clinic,
        as: "Clinics",
        attributes: ["id", "name", "address", "photo_url"],
        through: {
          attributes: ["day_of_week", "start_time", "end_time"],
        },
        include: locationIncludes(lang),
      },
    ],
    order: [["id", "DESC"]],
    limit,
    subQuery: false,
  });
};

exports.findFeaturedClinics = async ({ lang, limit }) => {
  return Clinic.findAll({
    attributes: ["id", "name", "address", "photo_url"],
    include: locationIncludes(lang),
    order: [["id", "DESC"]],
    limit,
  });
};

// ── RENDEZ-VOUS À VENIR ─────────────────────────────

/**
 * Rendez-vous à venir (pending / confirmed) :
 * - date strictement future
 * - OU aujourd'hui avec une heure pas encore passée
 */
exports.findUpcomingAppointments = async ({
  patientId,
  today,
  nowTime,
  limit,
}) => {
  return Appointment.findAll({
    where: {
      patient_id: patientId,
      status: { [Op.in]: ["pending", "confirmed"] },
      [Op.or]: [
        { appointment_date: { [Op.gt]: today } },
        {
          appointment_date: today,
          appointment_time: { [Op.gte]: nowTime },
        },
      ],
    },
    order: [
      ["appointment_date", "ASC"],
      ["appointment_time", "ASC"],
    ],
    include: [
      {
        model: Doctor,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["full_name"],
          },
          {
            model: Specialty,
            attributes: ["name"],
          },
        ],
      },
      {
        model: Clinic,
        attributes: ["id", "name", "address", "photo_url"],
      },
    ],
    limit,
  });
};