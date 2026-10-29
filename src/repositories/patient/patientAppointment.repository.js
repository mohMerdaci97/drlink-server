const { Op } = require("sequelize");
const {
  Appointment,
  Doctor,
  User,
  Specialty,
  Clinic,
  DoctorClinic,
  Patient,
} = require("../../models");
const { ACTIVE_STATUSES } = require("../../constants/appointment");

const doctorInclude = {
  model: Doctor,
  required: false,
  include: [
    {
      model: User,
      as: "user",
      attributes: ["full_name", "phone"],
      required: false,
    },
    { model: Specialty, attributes: ["id", "name"], required: false },
  ],
};

const clinicInclude = {
  model: Clinic,
  attributes: ["id", "name", "address", "phone", "photo_url"],
  required: false,
};

const buildScope = (scope, today, nowTime) => {
  if (scope === "upcoming") {
    return {
      status: { [Op.in]: ACTIVE_STATUSES },
      [Op.or]: [
        { appointment_date: { [Op.gt]: today } },
        { appointment_date: today, appointment_time: { [Op.gte]: nowTime } },
      ],
    };
  }

  if (scope === "past") {
    return {
      [Op.or]: [
        { status: { [Op.notIn]: ACTIVE_STATUSES } },
        { appointment_date: { [Op.lt]: today } },
        { appointment_date: today, appointment_time: { [Op.lt]: nowTime } },
      ],
    };
  }

  return {};
};

// ── Patient ─────────────────────────────────────────

exports.findPatientByUserId = async (userId) => {
  return Patient.findOne({
    where: { user_id: userId },
    include: [
      { model: User, as: "user", attributes: ["id", "is_active"], required: false },
    ],
  });
};

// Lock the patient row so parallel bookings run one by one
exports.lockPatient = async (patientId, transaction) => {
  return Patient.findByPk(patientId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

// ── Read ────────────────────────────────────────────

exports.findAndCountByPatient = async ({
  patientId,
  statuses,
  scope,
  today,
  nowTime,
  limit,
  offset,
}) => {
  const conditions = [
    { patient_id: patientId, ...buildScope(scope, today, nowTime) },
  ];

  // Separate condition so it does not overwrite the scope status
  if (statuses.length) conditions.push({ status: { [Op.in]: statuses } });

  return Appointment.findAndCountAll({
    where: { [Op.and]: conditions },
    include: [doctorInclude, clinicInclude],
    order:
      scope === "upcoming"
        ? [["appointment_date", "ASC"], ["appointment_time", "ASC"]]
        : [["appointment_date", "DESC"], ["appointment_time", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
};

exports.findOneByPatient = async (id, patientId) => {
  return Appointment.findOne({
    where: { id, patient_id: patientId },
    include: [doctorInclude, clinicInclude],
  });
};

// ── Doctor and schedule ─────────────────────────────

// Approved doctor with an active account. Locks only the doctor row.
exports.findBookableDoctor = async (doctorId, transaction) => {
  return Doctor.findOne({
    where: { id: doctorId, is_approved: true },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id"],
        where: { is_active: true },
        required: true,
      },
    ],
    transaction,
    lock: transaction
      ? { level: transaction.LOCK.UPDATE, of: Doctor }
      : undefined,
  });
};

exports.findSchedules = async (doctorId, clinicId) => {
  return DoctorClinic.findAll({
    where: { doctor_id: doctorId, clinic_id: clinicId },
    attributes: ["day_of_week", "start_time", "end_time"],
  });
};

exports.findBookedTimes = async (doctorId, date) => {
  return Appointment.findAll({
    where: {
      doctor_id: doctorId,
      appointment_date: date,
      status: { [Op.in]: ACTIVE_STATUSES },
    },
    attributes: ["appointment_time"],
    raw: true,
  });
};

// ── Conflicts and limits ────────────────────────────

exports.findDoctorConflict = async ({ doctorId, date, time, excludeId, transaction }) => {
  const where = {
    doctor_id: doctorId,
    appointment_date: date,
    appointment_time: time,
    status: { [Op.in]: ACTIVE_STATUSES },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  return Appointment.findOne({ where, transaction });
};

exports.findPatientConflict = async ({ patientId, date, time, excludeId, transaction }) => {
  const where = {
    patient_id: patientId,
    appointment_date: date,
    appointment_time: time,
    status: { [Op.in]: ACTIVE_STATUSES },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  return Appointment.findOne({ where, transaction });
};

exports.countActiveByPatient = async (patientId, transaction) => {
  return Appointment.count({
    where: { patient_id: patientId, status: { [Op.in]: ACTIVE_STATUSES } },
    transaction,
  });
};

exports.countActiveByPatientAndDoctor = async (patientId, doctorId, transaction) => {
  return Appointment.count({
    where: {
      patient_id: patientId,
      doctor_id: doctorId,
      status: { [Op.in]: ACTIVE_STATUSES },
    },
    transaction,
  });
};



exports.create = async (data, options = {}) => {
  return Appointment.create(data, options);
};

// Update only if still pending/confirmed. Returns number of rows changed.
exports.updateIfActive = async ({ id, patientId, data, transaction }) => {
  const [affected] = await Appointment.update(data, {
    where: {
      id,
      patient_id: patientId,
      status: { [Op.in]: ACTIVE_STATUSES },
    },
    transaction,
  });

  return affected;
};