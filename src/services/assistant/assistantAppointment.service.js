const { sequelize } = require("../../models");
const repository = require("../../repositories/assistant/assistantAppointment.repository");

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const BOOKED_STATUSES = ["pending", "confirmed"];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError("Format de date invalide. Utilisez AAAA-MM-JJ.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createError("La date fournie est invalide.");
  }

  return value;
};

const normalizeTime = (value) => {
  if (typeof value !== "string") {
    throw createError("Format d'heure invalide.");
  }

  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);

  if (!match) {
    throw createError("Format d'heure invalide. Utilisez HH:mm.");
  }

  return `${match[1]}:${match[2]}`;
};

const normalizeId = (value, fieldName) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) <= 0
  ) {
    throw createError(`${fieldName} invalide.`);
  }

  return Number(value);
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(
    2,
    "0",
  )}`;
};

const getDayOfWeek = (dateString) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[new Date(`${dateString}T00:00:00.000Z`).getUTCDay()];
};

const getAssistantDoctor = async (userId) => {
  const assistant = await repository.findAssistantByUserId(userId);

  if (!assistant) {
    throw createError("Assistant introuvable.", 404);
  }

  if (!assistant.doctor_id) {
    throw createError("Aucun médecin n'est associé à cet assistant.", 403);
  }

  return assistant;
};

const assistantAppointmentService = {
  async getMyClinics(userId) {
    const assistant = await getAssistantDoctor(userId);

    return repository.findClinicsByDoctorId(assistant.doctor_id);
  },

  async getAppointmentsByDate(userId, date) {
    const assistant = await getAssistantDoctor(userId);
    const appointmentDate = normalizeDate(date);

    return repository.findAppointmentsByDate({
      doctorId: assistant.doctor_id,
      date: appointmentDate,
    });
  },

  async getTodaysAppointments(userId, today) {
    return assistantAppointmentService.getAppointmentsByDate(userId, today);
  },

  async updateAppointmentStatus(userId, appointmentId, status) {
    const assistant = await getAssistantDoctor(userId);
    const normalizedAppointmentId = normalizeId(
      appointmentId,
      "Identifiant du rendez-vous",
    );

    if (!VALID_STATUSES.includes(status)) {
      throw createError("Statut de rendez-vous invalide.");
    }

    const appointment = await repository.findAppointmentByIdForDoctor({
      appointmentId: normalizedAppointmentId,
      doctorId: assistant.doctor_id,
    });

    if (!appointment) {
      throw createError("Rendez-vous introuvable.", 404);
    }

    if (
      ["completed", "cancelled"].includes(appointment.status) &&
      appointment.status !== status
    ) {
      throw createError(
        "Impossible de modifier un rendez-vous terminé ou annulé.",
      );
    }

    return repository.updateAppointmentStatus(appointment, status);
  },

  async getAvailableSlots(userId, clinicId, date) {
    const assistant = await getAssistantDoctor(userId);
    const normalizedClinicId = normalizeId(
      clinicId,
      "Identifiant de la clinique",
    );
    const appointmentDate = normalizeDate(date);
    const dayOfWeek = getDayOfWeek(appointmentDate);

    const schedule = await repository.findDoctorClinicSchedule({
      doctorId: assistant.doctor_id,
      clinicId,
      dayOfWeek,
    });

    if (!schedule) {
      return {
        date: appointmentDate,
        day_of_week: dayOfWeek,
        slot_duration: 30,
        start_time: null,
        end_time: null,
        slots: [],
      };
    }

    const slotDuration = Number(schedule.slot_duration || 30);

    if (!Number.isInteger(slotDuration) || slotDuration <= 0) {
      throw createError("La durée des créneaux du médecin est invalide.", 500);
    }

    const startTime = normalizeTime(schedule.start_time);
    const endTime = normalizeTime(schedule.end_time);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw createError(
        "Les horaires de consultation configurés sont invalides.",
        500,
      );
    }

    const appointments = await repository.findAppointmentsForDate({
      doctorId: assistant.doctor_id,
      clinicId: normalizedClinicId,
      date: appointmentDate,
      statuses: BOOKED_STATUSES,
    });

    const bookedSlots = new Set(
      appointments.map((appointment) =>
        normalizeTime(appointment.appointment_time),
      ),
    );

    const slots = [];

    for (
      let current = startMinutes;
      current + slotDuration <= endMinutes;
      current += slotDuration
    ) {
      const time = minutesToTime(current);

      slots.push({
        time,
        available: !bookedSlots.has(time),
      });
    }

    return {
      date: appointmentDate,
      day_of_week: dayOfWeek,
      slot_duration: slotDuration,
      start_time: startTime,
      end_time: endTime,
      slots,
    };
  },

  async bookAppointmentForPatient(userId, data) {
    const assistant = await getAssistantDoctor(userId);

    const patientId = normalizeId(data.patient_id, "Identifiant du patient");
    const clinicId = normalizeId(data.clinic_id, "Identifiant de la clinique");
    const appointmentDate = normalizeDate(data.appointment_date);
    const appointmentTime = normalizeTime(data.appointment_time);

    const schedule = await repository.findDoctorClinicSchedule({
      doctorId: assistant.doctor_id,
      clinicId,
      dayOfWeek: getDayOfWeek(appointmentDate),
    });

    if (!schedule) {
      throw createError(
        "Le médecin ne consulte pas dans cette clinique à cette date.",
      );
    }

    const startTime = normalizeTime(schedule.start_time);
    const endTime = normalizeTime(schedule.end_time);
    const slotDuration = Number(schedule.slot_duration || 30);

    if (!Number.isInteger(slotDuration) || slotDuration <= 0) {
      throw createError("La durée des créneaux du médecin est invalide.", 500);
    }

    const requestedMinutes = timeToMinutes(appointmentTime);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (
      endMinutes <= startMinutes ||
      requestedMinutes < startMinutes ||
      requestedMinutes + slotDuration > endMinutes ||
      (requestedMinutes - startMinutes) % slotDuration !== 0
    ) {
      throw createError(
        "L'horaire demandé ne correspond pas à un créneau disponible.",
      );
    }

    const patient = await repository.findPatientById(patientId);

    if (!patient) {
      throw createError("Patient introuvable.", 404);
    }

    return sequelize.transaction(async (transaction) => {
      const existingLink = await repository.findDoctorPatientLink({
        doctorId: assistant.doctor_id,
        patientId,
        transaction,
      });

      if (!existingLink) {
        await repository.createDoctorPatientLink({
          doctorId: assistant.doctor_id,
          patientId,
          transaction,
        });
      }

      const existingAppointments = await repository.findAppointmentsForDate({
        doctorId: assistant.doctor_id,
        clinicId,
        date: appointmentDate,
        statuses: BOOKED_STATUSES,
        transaction,
      });

      const slotTaken = existingAppointments.some(
        (appointment) =>
          normalizeTime(appointment.appointment_time) === appointmentTime,
      );

      if (slotTaken) {
        throw createError(
          "Ce créneau vient d'être réservé. Veuillez en choisir un autre.",
          409,
        );
      }

      return repository.createAppointment(
        {
          doctor_id: assistant.doctor_id,
          patient_id: patientId,
          clinic_id: clinicId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          status: "confirmed",
        },
        transaction,
      );
    });
  },
};

module.exports = assistantAppointmentService;
