const { Appointment, Patient, User, Clinic, Doctor } = require("../models");
const { Op, fn, col, literal } = require("sequelize");

async function getDoctor(userId) {
  const doctor = await Doctor.findOne({ where: { user_id: userId } });
  if (!doctor) throw { status: 404, message: "Profil médecin introuvable." };
  return doctor;
}

// ── GET /api/doctor/patients ──────────────────────────────────────────────────
// Unique patients who booked with this doctor
exports.getAll = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const { search } = req.query;

    const apptWhere = { doctor_id: doctor.id };

    const rows = await Appointment.findAll({
      where: apptWhere,
      attributes: [
        "patient_id",
        [fn("COUNT", col("Appointment.id")), "total_appointments"],
        [fn("MAX", col("appointment_date")), "last_date"],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END"),
          ),
          "completed_count",
        ],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END"),
          ),
          "cancelled_count",
        ],
      ],
      group: ["patient_id", "Patient.id", "Patient->user.id"],
      include: [
        {
          model: Patient,
          attributes: ["id", "gender", "date_of_birth"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone", "email"],
              ...(search?.trim()
                ? {
                    where: { full_name: { [Op.iLike]: `%${search.trim()}%` } },
                  }
                : {}),
            },
          ],
        },
      ],
      order: [[literal('"last_date"'), "DESC"]],
      raw: false,
    });

    const patients = rows.map((r) => ({
      patient_id: r.patient_id,
      full_name: r.Patient?.user?.full_name ?? "—",
      phone: r.Patient?.user?.phone ?? "—",
      email: r.Patient?.user?.email ?? null,
      gender: r.Patient?.gender ?? null,
      date_of_birth: r.Patient?.date_of_birth ?? null,
      total_appointments: parseInt(r.dataValues.total_appointments) || 0,
      completed_count: parseInt(r.dataValues.completed_count) || 0,
      cancelled_count: parseInt(r.dataValues.cancelled_count) || 0,
      last_appointment: r.dataValues.last_date ?? null,
    }));

    res.json({ data: patients, total: patients.length });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorPatients.getAll:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── GET /api/doctor/patients/:patientId ───────────────────────────────────────
// Patient detail
exports.getOne = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const patientId = parseInt(req.params.patientId);

    // Verify this patient has at least one appt with this doctor
    const exists = await Appointment.count({
      where: { doctor_id: doctor.id, patient_id: patientId },
    });
    if (!exists)
      return res.status(404).json({ message: "Patient introuvable." });

    const patient = await Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "phone", "email", "created_at"],
        },
      ],
    });
    if (!patient)
      return res.status(404).json({ message: "Patient introuvable." });

    // Full appointment history with this doctor
    const appointments = await Appointment.findAll({
      where: { doctor_id: doctor.id, patient_id: patientId },
      order: [
        ["appointment_date", "DESC"],
        ["appointment_time", "DESC"],
      ],
      attributes: [
        "id",
        "appointment_date",
        "appointment_time",
        "status",
        "created_at",
      ],
      include: [{ model: Clinic, attributes: ["id", "name", "address"] }],
    });

    res.json({
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
        completed: appointments.filter((a) => a.status === "completed").length,
        cancelled: appointments.filter((a) => a.status === "cancelled").length,
        pending: appointments.filter((a) => a.status === "pending").length,
        confirmed: appointments.filter((a) => a.status === "confirmed").length,
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorPatients.getOne:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
