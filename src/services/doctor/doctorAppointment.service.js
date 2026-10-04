const repository = require("../../repositories/doctor/doctorAppointment.repository");

const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const getDoctor = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");
    error.status = 404;
    throw error;
  }

  return doctor;
};

exports.getAll = async ({
  userId,
  page,
  limit,
  offset,
  status,
  date,
  search,
}) => {
  const doctor = await getDoctor(userId);

  const where = {
    doctor_id: doctor.id,
  };

  if (status) {
    where.status = status;
  }

  if (date) {
    where.appointment_date = date;
  }

  if (search?.trim()) {
    const patientIds = await repository.findPatientsByUserName(search.trim());

    where.patient_id = {
      [require("sequelize").Op.in]: patientIds,
    };
  }

  const { count, rows } = await repository.findAndCountAll({
    where,
    limit,
    offset,
  });

  const stats = await Promise.all(
    ["pending", "confirmed", "completed", "cancelled"].map(
      async (appointmentStatus) => {
        const count = await repository.countByStatus({
          doctorId: doctor.id,
          date,
          status: appointmentStatus,
        });

        return [appointmentStatus, count];
      },
    ),
  );

  return {
    data: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit,
    },
    stats: Object.fromEntries(stats),
  };
};

exports.getToday = async (userId, date) => {
  const doctor = await getDoctor(userId);

  const rows = await repository.findToday(doctor.id, date);

  return {
    data: rows,
    date,
  };
};

const changeStatus = async ({ userId, appointmentId, newStatus }) => {
  const doctor = await getDoctor(userId);

  const appointment = await repository.findByIdForDoctor(
    appointmentId,
    doctor.id,
  );

  if (!appointment) {
    const error = new Error("Rendez-vous introuvable.");
    error.status = 404;
    throw error;
  }

  const allowed = TRANSITIONS[appointment.status] ?? [];

  if (!allowed.includes(newStatus)) {
    const error = new Error(
      `Impossible de passer de "${appointment.status}" à "${newStatus}".`,
    );
    error.status = 400;
    throw error;
  }

  await repository.updateStatus(appointment, newStatus);

  return {
    message: "Statut mis à jour.",
    appointment: {
      id: appointment.id,
      status: appointment.status,
    },
  };
};

exports.confirm = async (userId, appointmentId) => {
  return changeStatus({
    userId,
    appointmentId,
    newStatus: "confirmed",
  });
};

exports.cancel = async (userId, appointmentId) => {
  return changeStatus({
    userId,
    appointmentId,
    newStatus: "cancelled",
  });
};

exports.complete = async (userId, appointmentId) => {
  return changeStatus({
    userId,
    appointmentId,
    newStatus: "completed",
  });
};
