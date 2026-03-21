const {
  Doctor,
  Appointment,
  Patient,
  User,
  Clinic,
  DoctorClinic,
  sequelize,
} = require("../models");
const { Op, fn, col, literal } = require("sequelize");

// get doctor record from user_id
async function getDoctorByUserId(userId) {
  const doctor = await Doctor.findOne({ where: { user_id: userId } });
  if (!doctor) throw { status: 404, message: "Profil médecin introuvable." };
  return doctor;
}

const startOf = (unit) => {
  const d = new Date();
  if (unit === "week") d.setDate(d.getDate() - d.getDay());
  if (unit === "month") d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ── GET stats
exports.getStats = async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.id);
    const doctorId = doctor.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const thisWeek = startOf("week");
    const thisMonth = startOf("month");

    // Appointment counts
    const [
      totalAppts,
      todayAppts,
      weekAppts,
      monthAppts,
      pending,
      confirmed,
      completed,
      cancelled,
    ] = await Promise.all([
      Appointment.count({ where: { doctor_id: doctorId } }),
      Appointment.count({
        where: {
          doctor_id: doctorId,
          appointment_date: { [Op.gte]: today, [Op.lt]: tomorrow },
        },
      }),
      Appointment.count({
        where: {
          doctor_id: doctorId,
          appointment_date: { [Op.gte]: thisWeek },
        },
      }),
      Appointment.count({
        where: {
          doctor_id: doctorId,
          appointment_date: { [Op.gte]: thisMonth },
        },
      }),
      Appointment.count({ where: { doctor_id: doctorId, status: "pending" } }),
      Appointment.count({
        where: { doctor_id: doctorId, status: "confirmed" },
      }),
      Appointment.count({
        where: { doctor_id: doctorId, status: "completed" },
      }),
      Appointment.count({
        where: { doctor_id: doctorId, status: "cancelled" },
      }),
    ]);

    // ── Unique patients seen ──────────────────────────────────────────────────
    const uniquePatients = await Appointment.count({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ["completed", "confirmed"] },
      },
      distinct: true,
      col: "patient_id",
    });

    // ── Next 5 upcoming appointments ─────────────────────────────────────────
    const upcoming = await Appointment.findAll({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ["pending", "confirmed"] },
        appointment_date: { [Op.gte]: today },
      },
      order: [
        ["appointment_date", "ASC"],
        ["appointment_time", "ASC"],
      ],
      limit: 5,
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

    // ── Appointments by day of week (PostgreSQL) ──────────────────────────────
    const byDow = await Appointment.findAll({
      where: { doctor_id: doctorId },
      attributes: [
        [fn("EXTRACT", literal("DOW FROM appointment_date")), "dow"],
        [fn("COUNT", col("Appointment.id")), "count"],
      ],
      group: [fn("EXTRACT", literal("DOW FROM appointment_date"))],
      order: [[fn("EXTRACT", literal("DOW FROM appointment_date")), "ASC"]],
      raw: true,
    });

    // ── Appointments by month (last 6) ────────────────────────────────────────
    const last6 = new Date();
    last6.setMonth(last6.getMonth() - 5);
    last6.setDate(1);
    const byMonth = await Appointment.findAll({
      where: { doctor_id: doctorId, appointment_date: { [Op.gte]: last6 } },
      attributes: [
        [fn("TO_CHAR", col("appointment_date"), "YYYY-MM"), "month"],
        [fn("COUNT", col("Appointment.id")), "count"],
      ],
      group: [fn("TO_CHAR", col("appointment_date"), "YYYY-MM")],
      order: [[fn("TO_CHAR", col("appointment_date"), "YYYY-MM"), "ASC"]],
      raw: true,
    });

    // ── Clinics count ─────────────────────────────────────────────────────────
    const clinicsCount = await DoctorClinic.count({
      where: { doctor_id: doctorId },
      distinct: true,
      col: "clinic_id",
    });

    res.json({
      appointments: {
        total: totalAppts,
        today: todayAppts,
        thisWeek: weekAppts,
        thisMonth: monthAppts,
        pending,
        confirmed,
        completed,
        cancelled,
        completionRate:
          totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0,
        cancellationRate:
          totalAppts > 0 ? Math.round((cancelled / totalAppts) * 100) : 0,
      },
      patients: {
        unique: uniquePatients,
      },
      clinics: {
        total: clinicsCount,
      },
      upcoming: upcoming.map((a) => ({
        id: a.id,
        date: a.appointment_date,
        time: a.appointment_time?.slice(0, 5) ?? "—",
        status: a.status,
        patient: {
          id: a.Patient?.id,
          full_name: a.Patient?.user?.full_name ?? "—",
          phone: a.Patient?.user?.phone ?? "—",
        },
        clinic: {
          id: a.Clinic?.id,
          name: a.Clinic?.name ?? "—",
        },
      })),
      charts: {
        byDayOfWeek: byDow.map((r) => ({
          dow: parseInt(r.dow),
          count: parseInt(r.count),
        })),
        byMonth: byMonth.map((r) => ({
          month: r.month,
          count: parseInt(r.count),
        })),
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorStats error:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
