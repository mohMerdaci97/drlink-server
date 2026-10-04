const repository = require("../../repositories/doctor/doctorPatients.repository");

/* HELPERS*/

const getDoctor = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");

    error.status = 404;

    throw error;
  }

  return doctor;
};

const parsePatientId = (patientId) => {
  const id = parseInt(patientId, 10);

  if (Number.isNaN(id)) {
    const error = new Error("Identifiant du patient invalide.");

    error.status = 400;

    throw error;
  }

  return id;
};



exports.getAll = async (userId, search) => {
  const doctor = await getDoctor(userId);

  const rows = await repository.findPatientStats({
    doctorId: doctor.id,
    search,
  });

  const patients = rows.map((row) => ({
    patient_id: row.patient_id,

    full_name: row.Patient?.user?.full_name ?? "—",

    phone: row.Patient?.user?.phone ?? "—",

    email: row.Patient?.user?.email ?? null,

    gender: row.Patient?.gender ?? null,

    date_of_birth: row.Patient?.date_of_birth ?? null,

    total_appointments: parseInt(row.dataValues.total_appointments, 10) || 0,

    completed_count: parseInt(row.dataValues.completed_count, 10) || 0,

    cancelled_count: parseInt(row.dataValues.cancelled_count, 10) || 0,

    last_appointment: row.dataValues.last_date ?? null,
  }));

  return {
    data: patients,
    total: patients.length,
  };
};

/* =========================================================
   GET ONE PATIENT
========================================================= */

exports.getOne = async (userId, patientId) => {
  const doctor = await getDoctor(userId);

  const id = parsePatientId(patientId);

  /*
   * Security check:
   * the patient must have at least
   * one appointment with this doctor.
   */
  const exists = await repository.countPatientAppointments({
    doctorId: doctor.id,
    patientId: id,
  });

  if (!exists) {
    const error = new Error("Patient introuvable.");

    error.status = 404;

    throw error;
  }

  const patient = await repository.findPatientById(id);

  if (!patient) {
    const error = new Error("Patient introuvable.");

    error.status = 404;

    throw error;
  }

  const appointments = await repository.findPatientAppointments({
    doctorId: doctor.id,
    patientId: id,
  });

  return {
    patient: {
      id: patient.id,

      full_name: patient.user?.full_name ?? "—",

      phone: patient.user?.phone ?? "—",

      email: patient.user?.email ?? null,

      gender: patient.gender ?? null,

      date_of_birth: patient.date_of_birth ?? null,

      member_since: patient.user?.created_at ?? null,
    },

    appointments,

    stats: {
      total: appointments.length,

      completed: appointments.filter(
        (appointment) => appointment.status === "completed",
      ).length,

      cancelled: appointments.filter(
        (appointment) => appointment.status === "cancelled",
      ).length,

      pending: appointments.filter(
        (appointment) => appointment.status === "pending",
      ).length,

      confirmed: appointments.filter(
        (appointment) => appointment.status === "confirmed",
      ).length,
    },
  };
};
