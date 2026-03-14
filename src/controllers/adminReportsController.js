const {
  User,
  Patient,
  Doctor,
  Specialty,
  Clinic,
  Appointment,
  sequelize,
} = require("../models");
const { Op, fn, col, literal } = require("sequelize");

// ─── helpers ──────────────────────────────────────────────────────────────────
const startOf = (unit) => {
  const d = new Date();
  if (unit === "week") d.setDate(d.getDate() - d.getDay());
  if (unit === "month") d.setDate(1);
  if (unit === "year") d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

// ─── GET /api/admin/reports ───────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = startOf("month");
    const thisWeek = startOf("week");
    const thisYear = startOf("year");
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );
    const last6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ── 1. USER OVERVIEW ─────────────────────────────────────────────────────
    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { role: "doctor" } }),
      User.count({ where: { role: "patient" } }),
      User.count({ where: { is_active: true } }),
      User.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
      User.count({
        where: { created_at: { [Op.between]: [lastMonth, lastMonthEnd] } },
      }),
    ]);

    // ── 2. DOCTOR STATS ──────────────────────────────────────────────────────
    const [approvedDoctors, pendingDoctors] = await Promise.all([
      Doctor.count({ where: { is_approved: true } }),
      Doctor.count({ where: { is_approved: false } }),
    ]);

    // Active doctors: join to users table
    // Doctor.belongsTo(User) has no `as` alias → use model: User, no as
    const activeDoctors = await Doctor.count({
      include: [
        {
          model: User,
          where: { is_active: true },
          attributes: [],
          required: true, // ← INNER JOIN
        },
      ],
    });

    // Doctors per specialty (top 8) — simple subquery approach to avoid GROUP BY issues
    const doctorsBySpecialtyRaw = await Doctor.findAll({
      where: { is_approved: true, specialty_id: { [Op.ne]: null } },
      attributes: ["specialty_id", [fn("COUNT", col("Doctor.id")), "count"]],
      include: [
        {
          model: Specialty,
          attributes: ["name"],
          required: true,
        },
      ],
      group: ["Doctor.specialty_id", "Specialty.id", "Specialty.name"],
      order: [[literal("count"), "DESC"]],
      limit: 8,
      raw: true,
      nest: true,
    });

    // ── 3. PATIENT STATS ─────────────────────────────────────────────────────
    const [newPatientsThisMonth, newPatientsLastMonth] = await Promise.all([
      User.count({
        where: { role: "patient", created_at: { [Op.gte]: thisMonth } },
      }),
      User.count({
        where: {
          role: "patient",
          created_at: { [Op.between]: [lastMonth, lastMonthEnd] },
        },
      }),
    ]);

    const activePatients = await Patient.count({
      include: [
        {
          model: User,
          as: "user", // Patient.belongsTo(User, { as: "user" }) in models/index.js
          where: { is_active: true },
          attributes: [],
          required: true,
        },
      ],
    });

    // Gender split
    const genderRows = await Patient.findAll({
      attributes: ["gender", [fn("COUNT", col("Patient.id")), "count"]],
      group: ["Patient.gender"],
      raw: true,
    });
    const genderMap = {};
    genderRows.forEach((r) => {
      genderMap[r.gender ?? "unknown"] = parseInt(r.count);
    });

    // ── 4. APPOINTMENT STATS ─────────────────────────────────────────────────
    const [
      totalAppts,
      pendingAppts,
      confirmedAppts,
      completedAppts,
      cancelledAppts,
      apptThisWeek,
      apptThisMonth,
      apptThisYear,
      apptLastMonth,
    ] = await Promise.all([
      Appointment.count(),
      Appointment.count({ where: { status: "pending" } }),
      Appointment.count({ where: { status: "confirmed" } }),
      Appointment.count({ where: { status: "completed" } }),
      Appointment.count({ where: { status: "cancelled" } }),
      Appointment.count({
        where: { appointment_date: { [Op.gte]: thisWeek } },
      }),
      Appointment.count({
        where: { appointment_date: { [Op.gte]: thisMonth } },
      }),
      Appointment.count({
        where: { appointment_date: { [Op.gte]: thisYear } },
      }),
      Appointment.count({
        where: {
          appointment_date: { [Op.between]: [lastMonth, lastMonthEnd] },
        },
      }),
    ]);

    // Appointments by month — PostgreSQL: TO_CHAR(date, 'YYYY-MM')
    const apptByMonth = await Appointment.findAll({
      attributes: [
        [fn("TO_CHAR", col("appointment_date"), "YYYY-MM"), "month"],
        [fn("COUNT", col("Appointment.id")), "count"],
      ],
      where: { appointment_date: { [Op.gte]: last6Months } },
      group: [fn("TO_CHAR", col("appointment_date"), "YYYY-MM")],
      order: [[fn("TO_CHAR", col("appointment_date"), "YYYY-MM"), "ASC"]],
      raw: true,
    });

    // Appointments by day of week — PostgreSQL: EXTRACT(DOW FROM date) 0=Sun 6=Sat
    const apptByDow = await Appointment.findAll({
      attributes: [
        [fn("EXTRACT", literal("DOW FROM appointment_date")), "dow"],
        [fn("COUNT", col("Appointment.id")), "count"],
      ],
      group: [fn("EXTRACT", literal("DOW FROM appointment_date"))],
      order: [[fn("EXTRACT", literal("DOW FROM appointment_date")), "ASC"]],
      raw: true,
    });

    // Peak hours — PostgreSQL: EXTRACT(HOUR FROM time)
    const apptByHour = await Appointment.findAll({
      attributes: [
        [fn("EXTRACT", literal("HOUR FROM appointment_time")), "hour"],
        [fn("COUNT", col("Appointment.id")), "count"],
      ],
      group: [fn("EXTRACT", literal("HOUR FROM appointment_time"))],
      order: [[fn("EXTRACT", literal("HOUR FROM appointment_time")), "ASC"]],
      raw: true,
    });

    // ── 5. CLINIC STATS ──────────────────────────────────────────────────────
    const totalClinics = await Clinic.count();

    // Top clinics — group only on what we select
    const topClinics = await Appointment.findAll({
      attributes: ["clinic_id", [fn("COUNT", col("Appointment.id")), "count"]],
      where: { clinic_id: { [Op.ne]: null } },
      include: [{ model: Clinic, attributes: ["id", "name"], required: true }],
      group: ["Appointment.clinic_id", "Clinic.id", "Clinic.name"],
      order: [[literal('"count"'), "DESC"]],
      limit: 5,
      raw: true,
      nest: true,
    });

    // ── 6. SPECIALTY STATS ───────────────────────────────────────────────────
    const totalSpecialties = await Specialty.count();

    // Top specialties by appointment count — raw SQL (PostgreSQL syntax)
    const topSpecialties = await sequelize.query(
      `
      SELECT
        s.id            AS specialty_id,
        s.name          AS specialty_name,
        COUNT(a.id)     AS appt_count
      FROM appointments a
      INNER JOIN doctors d      ON a.doctor_id    = d.id
      INNER JOIN specialties s  ON d.specialty_id = s.id
      GROUP BY s.id, s.name
      ORDER BY appt_count DESC
      LIMIT 6
    `,
      { type: sequelize.QueryTypes.SELECT },
    );

    // ── 7. COMPUTED KPIs ─────────────────────────────────────────────────────
    const completionRate = pct(completedAppts, totalAppts);
    const cancellationRate = pct(cancelledAppts, totalAppts);
    const approvalRate = pct(approvedDoctors, totalDoctors || 1);
    const userGrowthRate =
      newUsersLastMonth > 0
        ? Math.round(
            ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100,
          )
        : 100;
    const apptGrowthRate =
      apptLastMonth > 0
        ? Math.round(((apptThisMonth - apptLastMonth) / apptLastMonth) * 100)
        : 100;
    const patientGrowthRate =
      newPatientsLastMonth > 0
        ? Math.round(
            ((newPatientsThisMonth - newPatientsLastMonth) /
              newPatientsLastMonth) *
              100,
          )
        : 100;

    // ── Response ──────────────────────────────────────────────────────────────
    res.json({
      generatedAt: now.toISOString(),

      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newThisMonth: newUsersThisMonth,
        growthRate: userGrowthRate,
      },

      doctors: {
        total: totalDoctors,
        approved: approvedDoctors,
        pending: pendingDoctors,
        active: activeDoctors,
        approvalRate,
        bySpecialty: doctorsBySpecialtyRaw.map((r) => ({
          specialtyId: r.specialty_id,
          specialtyName: r["Specialty.name"],
          count: parseInt(r.count),
        })),
      },

      patients: {
        total: totalPatients,
        active: activePatients,
        newThisMonth: newPatientsThisMonth,
        growthRate: patientGrowthRate,
        gender: {
          male: genderMap["male"] ?? 0,
          female: genderMap["female"] ?? 0,
          unknown: genderMap["unknown"] ?? 0,
        },
      },

      appointments: {
        total: totalAppts,
        pending: pendingAppts,
        confirmed: confirmedAppts,
        completed: completedAppts,
        cancelled: cancelledAppts,
        thisWeek: apptThisWeek,
        thisMonth: apptThisMonth,
        thisYear: apptThisYear,
        growthRate: apptGrowthRate,
        completionRate,
        cancellationRate,
        byMonth: apptByMonth.map((r) => ({
          month: r.month,
          count: parseInt(r.count),
        })),
        byDayOfWeek: apptByDow.map((r) => ({
          dow: parseInt(r.dow),
          count: parseInt(r.count),
        })),
        byHour: apptByHour.map((r) => ({
          hour: parseInt(r.hour),
          count: parseInt(r.count),
        })),
      },

      clinics: {
        total: totalClinics,
        topByVolume: topClinics.map((r) => ({
          clinicId: r["Clinic.id"],
          clinicName: r["Clinic.name"],
          count: parseInt(r.count),
        })),
      },

      specialties: {
        total: totalSpecialties,
        topByAppointments: topSpecialties.map((r) => ({
          specialtyId: r.specialty_id,
          specialtyName: r.specialty_name,
          count: parseInt(r.appt_count),
        })),
      },
    });
  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
};
