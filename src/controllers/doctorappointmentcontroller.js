const { Appointment, Patient, User, Clinic, Doctor } = require("../models");
const { Op } = require("sequelize");

// ── helper
async function getDoctor(userId) {
  const doctor = await Doctor.findOne({ where: { user_id: userId } });
  if (!doctor) throw { status: 404, message: "Profil médecin introuvable." };
  return doctor;
}

//pagination helper
function paginate(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, parseInt(query.limit) || 12);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

//allowed status transitions
const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// ── GET /api/doctor/appointments
exports.getAll = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const { page, limit, offset } = paginate(req.query);
    const { status, date, search } = req.query;

    const where = { doctor_id: doctor.id };

    if (status) where.status = status;
    if (date) where.appointment_date = date;

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      const users = await User.findAll({
        where: { full_name: { [Op.iLike]: term } },
        attributes: ["id"],
      });
      const userIds = users.map((u) => u.id);
      const patients = await Patient.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: ["id"],
      });
      where.patient_id = { [Op.in]: patients.map((p) => p.id) };
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [
        ["appointment_date", "ASC"],
        ["appointment_time", "ASC"],
      ],
      attributes: [
        "id",
        "appointment_date",
        "appointment_time",
        "status",
        "created_at",
      ],
      include: [
        {
          model: Patient,
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone", "email"],
            },
          ],
        },
        { model: Clinic, attributes: ["id", "name", "address", "phone"] },
      ],
    });

    // Stats for this doctor (not filtered by status)
    const statsWhere = { doctor_id: doctor.id };
    if (date) statsWhere.appointment_date = date;

    const [pending, confirmed, completed, cancelled] = await Promise.all([
      Appointment.count({ where: { ...statsWhere, status: "pending" } }),
      Appointment.count({ where: { ...statsWhere, status: "confirmed" } }),
      Appointment.count({ where: { ...statsWhere, status: "completed" } }),
      Appointment.count({ where: { ...statsWhere, status: "cancelled" } }),
    ]);

    res.json({
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      },
      stats: { pending, confirmed, completed, cancelled },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorAppointments.getAll:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── GET /api/doctor/appointments/today 
exports.getToday = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    const today = new Date().toISOString().slice(0, 10);

    const rows = await Appointment.findAll({
      where: { doctor_id: doctor.id, appointment_date: today },
      order: [["appointment_time", "ASC"]],
      attributes: ["id", "appointment_date", "appointment_time", "status"],
      include: [
        {
          model: Patient,
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone"],
            },
          ],
        },
        { model: Clinic, attributes: ["id", "name"] },
      ],
    });

    res.json({ data: rows, date: today });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── PATCH /api/doctor/appointments/:id/confirm 
exports.confirm = async (req, res) => {
  await changeStatus(req, res, "confirmed");
};

// ── PATCH /api/doctor/appointments/:id/cancel 
exports.cancel = async (req, res) => {
  await changeStatus(req, res, "cancelled");
};

// ── PATCH /api/doctor/appointments/:id/complete 
exports.complete = async (req, res) => {
  await changeStatus(req, res, "completed");
};

// ── shared status-change logic 
async function changeStatus(req, res, newStatus) {
  try {
    const doctor = await getDoctor(req.user.id);
    const appt = await Appointment.findOne({
      where: { id: req.params.id, doctor_id: doctor.id },
    });

    if (!appt) {
      return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    const allowed = TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        message: `Impossible de passer de "${appt.status}" à "${newStatus}".`,
      });
    }

    appt.status = newStatus;
    await appt.save();

    res.json({
      message: "Statut mis à jour.",
      appointment: { id: appt.id, status: appt.status },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorAppointments.changeStatus:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
}
