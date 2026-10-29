const { sequelize } = require("../../models");
const patientAppointmentRepository = require("../../repositories/patient/patientAppointment.repository");
const createError = require("../../helpers/httpError");
const { getNowInAlgiers, daysBetween } = require("../../helpers/dateTime");
const {
  weekdayOf,
  addDays,
  generateSlots,
  toTimestamp,
} = require("../../helpers/slots");
const {
  STATUS,
  ACTIVE_STATUSES,
  CANCEL_MIN_HOURS,
  MIN_LEAD_MINUTES,
  MAX_DAYS_AHEAD,
  MAX_ACTIVE_PER_PATIENT,
  MAX_ACTIVE_PER_DOCTOR,
  AVAILABLE_DAYS_WINDOW,
} = require("../../constants/appointment");

const ALLOWED_STATUSES = Object.values(STATUS);

// ── Private helpers ─────────────────────────────────

const getPatientOrFail = async (userId) => {
  const patient =
    await patientAppointmentRepository.findPatientByUserId(userId);

  if (!patient) throw createError(404, "Patient introuvable.");

  if (patient.user && patient.user.is_active === false) {
    throw createError(403, "Compte désactivé.");
  }

  return patient;
};

const getAppointmentOrFail = async (id, patientId) => {
  const appointment = await patientAppointmentRepository.findOneByPatient(
    id,
    patientId,
  );

  if (!appointment) throw createError(404, "Rendez-vous introuvable.");

  return appointment;
};

const isActive = (a) => ACTIVE_STATUSES.includes(a.status);

const hoursUntil = (a) =>
  (toTimestamp(a.appointment_date, a.appointment_time) - Date.now()) / 3600000;

// Lost race on the unique index -> clean 409
const rethrow = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    throw createError(409, "Ce créneau vient d'être réservé.");
  }
  throw error;
};

const format = (a, today) => {
  const daysUntil = daysBetween(today, a.appointment_date);
  const canChange = isActive(a) && hoursUntil(a) >= CANCEL_MIN_HOURS;

  return {
    id: a.id,
    status: a.status,
    appointment_date: a.appointment_date,
    appointment_time: a.appointment_time?.slice(0, 5) || null,
    days_until: daysUntil,
    is_today: daysUntil === 0,
    can_cancel: canChange,
    can_reschedule: canChange,
    doctor_id: a.doctor_id,
    doctor_name: a.Doctor?.user?.full_name ?? null,
    specialty: a.Doctor?.Specialty?.name ?? null,
    photo_url: a.Doctor?.photo_url ?? null,
    clinic_id: a.clinic_id,
    clinic_name: a.Clinic?.name ?? null,
    clinic_address: a.Clinic?.address ?? null,
    clinic_photo_url: a.Clinic?.photo_url ?? null,
  };
};

const formatDetails = (a, today) => ({
  ...format(a, today),
  doctor_phone: a.Doctor?.user?.phone ?? null,
  doctor_description: a.Doctor?.description ?? null,
  clinic_phone: a.Clinic?.phone ?? null,
});

// Business checks for a slot. Used by create and reschedule.
const validateSlot = async ({
  patientId,
  doctorId,
  clinicId,
  date,
  time,
  excludeId,
  transaction,
}) => {
  const now = getNowInAlgiers();

  if (date < now.date || (date === now.date && time <= now.time)) {
    throw createError(400, "Ce créneau est déjà passé.");
  }

  if (toTimestamp(date, time) - Date.now() < MIN_LEAD_MINUTES * 60000) {
    throw createError(
      400,
      `Réservez au moins ${MIN_LEAD_MINUTES} minutes à l'avance.`,
    );
  }

  if (daysBetween(now.date, date) > MAX_DAYS_AHEAD) {
    throw createError(
      400,
      `Réservation possible jusqu'à ${MAX_DAYS_AHEAD} jours à l'avance.`,
    );
  }

  const doctor = await patientAppointmentRepository.findBookableDoctor(
    doctorId,
    transaction,
  );
  if (!doctor) throw createError(404, "Médecin indisponible.");

  // Time must be one of the doctor's slots for that weekday and clinic
  const schedules = await patientAppointmentRepository.findSchedules(
    doctorId,
    clinicId,
  );
  const validTimes = schedules
    .filter((s) => s.day_of_week === weekdayOf(date))
    .flatMap((s) => generateSlots(s.start_time, s.end_time));

  if (!validTimes.includes(time)) {
    throw createError(400, "Le médecin ne consulte pas à cette heure.");
  }

  const doctorConflict = await patientAppointmentRepository.findDoctorConflict({
    doctorId,
    date,
    time,
    excludeId,
    transaction,
  });
  if (doctorConflict) throw createError(409, "Ce créneau est déjà réservé.");

  const patientConflict =
    await patientAppointmentRepository.findPatientConflict({
      patientId,
      date,
      time,
      excludeId,
      transaction,
    });
  if (patientConflict) {
    throw createError(409, "Vous avez déjà un rendez-vous à cette heure.");
  }
};

// ── Service ─────────────────────────────────────────

exports.getMyAppointments = async (
  userId,
  { status, scope, page, limit, offset },
) => {
  const patient = await getPatientOrFail(userId);
  const now = getNowInAlgiers();

  const statuses = (status || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ALLOWED_STATUSES.includes(s));

  const { count, rows } =
    await patientAppointmentRepository.findAndCountByPatient({
      patientId: patient.id,
      statuses,
      scope: ["upcoming", "past"].includes(scope) ? scope : null,
      today: now.date,
      nowTime: now.time,
      limit,
      offset,
    });

  return {
    appointments: rows.map((a) => format(a, now.date)),
    total: count,
    page,
    pages: Math.ceil(count / limit),
  };
};

exports.getOne = async (userId, id) => {
  const patient = await getPatientOrFail(userId);
  const appointment = await getAppointmentOrFail(id, patient.id);

  return formatDetails(appointment, getNowInAlgiers().date);
};

// Slots of one day with available true/false
exports.getAvailableSlots = async ({ doctorId, clinicId, date }) => {
  const schedules = await patientAppointmentRepository.findSchedules(
    doctorId,
    clinicId,
  );
  const booked = (
    await patientAppointmentRepository.findBookedTimes(doctorId, date)
  ).map((b) => b.appointment_time.slice(0, 5));

  const slots = schedules
    .filter((s) => s.day_of_week === weekdayOf(date))
    .flatMap((s) => generateSlots(s.start_time, s.end_time))
    .sort()
    .map((time) => ({
      time,
      available:
        !booked.includes(time) &&
        toTimestamp(date, time) - Date.now() >= MIN_LEAD_MINUTES * 60000,
    }));

  return { date, slots };
};

// Next days when the doctor works (for the calendar)
exports.getAvailableDays = async ({ doctorId, clinicId }) => {
  const now = getNowInAlgiers();
  const schedules = await patientAppointmentRepository.findSchedules(
    doctorId,
    clinicId,
  );
  const workingDays = schedules.map((s) => s.day_of_week);

  const days = [];
  for (let i = 0; i < AVAILABLE_DAYS_WINDOW; i++) {
    const date = addDays(now.date, i);
    if (workingDays.includes(weekdayOf(date))) days.push(date);
  }

  return { days };
};

exports.create = async (userId, data) => {
  const { doctor_id, clinic_id, appointment_date, appointment_time } = data;

  const patient = await getPatientOrFail(userId);
  const transaction = await sequelize.transaction();

  try {
    // Lock first: parallel bookings of this patient wait here
    await patientAppointmentRepository.lockPatient(patient.id, transaction);

    // Retry or double tap: same booking already exists, return it
    const existing = await patientAppointmentRepository.findPatientConflict({
      patientId: patient.id,
      date: appointment_date,
      time: appointment_time,
      transaction,
    });

    if (
      existing &&
      Number(existing.doctor_id) === Number(doctor_id) &&
      Number(existing.clinic_id) === Number(clinic_id)
    ) {
      await transaction.commit();

      return {
        id: existing.id,
        status: existing.status,
        appointment_date: existing.appointment_date,
        appointment_time: existing.appointment_time,
        already_booked: true,
      };
    }

    const activeCount = await patientAppointmentRepository.countActiveByPatient(
      patient.id,
      transaction,
    );
    if (activeCount >= MAX_ACTIVE_PER_PATIENT) {
      throw createError(
        400,
        `Maximum ${MAX_ACTIVE_PER_PATIENT} rendez-vous actifs.`,
      );
    }

    const doctorCount =
      await patientAppointmentRepository.countActiveByPatientAndDoctor(
        patient.id,
        doctor_id,
        transaction,
      );
    if (doctorCount >= MAX_ACTIVE_PER_DOCTOR) {
      throw createError(
        400,
        "Vous avez déjà des rendez-vous à venir avec ce médecin.",
      );
    }

    await validateSlot({
      patientId: patient.id,
      doctorId: doctor_id,
      clinicId: clinic_id,
      date: appointment_date,
      time: appointment_time,
      transaction,
    });

    const appointment = await patientAppointmentRepository.create(
      {
        patient_id: patient.id,
        doctor_id,
        clinic_id,
        appointment_date,
        appointment_time,
        status: STATUS.PENDING,
      },
      { transaction },
    );

    await transaction.commit();

    return {
      id: appointment.id,
      status: appointment.status,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      already_booked: false,
    };
  } catch (error) {
    await transaction.rollback();
    rethrow(error);
  }
};

exports.reschedule = async (userId, id, data) => {
  const { appointment_date, appointment_time } = data;

  const patient = await getPatientOrFail(userId);
  const appointment = await getAppointmentOrFail(id, patient.id);

  if (!isActive(appointment) || hoursUntil(appointment) < CANCEL_MIN_HOURS) {
    throw createError(400, "Ce rendez-vous ne peut plus être modifié.");
  }

  const sameSlot =
    appointment.appointment_date === appointment_date &&
    appointment.appointment_time.slice(0, 5) === appointment_time;

  if (sameSlot) throw createError(400, "C'est déjà votre créneau actuel.");

  const transaction = await sequelize.transaction();

  try {
    await validateSlot({
      patientId: patient.id,
      doctorId: appointment.doctor_id,
      clinicId: appointment.clinic_id,
      date: appointment_date,
      time: appointment_time,
      excludeId: appointment.id,
      transaction,
    });

    // New time must be confirmed again by the clinic
    const affected = await patientAppointmentRepository.updateIfActive({
      id: appointment.id,
      patientId: patient.id,
      data: { appointment_date, appointment_time, status: STATUS.PENDING },
      transaction,
    });

    if (!affected) {
      throw createError(409, "Ce rendez-vous vient d'être modifié.");
    }

    await transaction.commit();

    return { message: "Rendez-vous déplacé.", id: appointment.id };
  } catch (error) {
    await transaction.rollback();
    rethrow(error);
  }
};

exports.cancel = async (userId, id) => {
  const patient = await getPatientOrFail(userId);
  const appointment = await getAppointmentOrFail(id, patient.id);

  // Double tap: already cancelled is fine
  if (appointment.status === STATUS.CANCELLED) {
    return { message: "Rendez-vous annulé.", id: appointment.id };
  }

  if (!isActive(appointment)) {
    throw createError(400, "Ce rendez-vous ne peut pas être annulé.");
  }

  if (hoursUntil(appointment) < CANCEL_MIN_HOURS) {
    throw createError(
      400,
      `Annulation impossible moins de ${CANCEL_MIN_HOURS}h avant le rendez-vous.`,
    );
  }

  const affected = await patientAppointmentRepository.updateIfActive({
    id: appointment.id,
    patientId: patient.id,
    data: { status: STATUS.CANCELLED },
  });

  // Status changed between the read and the update
  if (!affected) throw createError(409, "Ce rendez-vous vient d'être modifié.");

  return { message: "Rendez-vous annulé.", id: appointment.id };
};
