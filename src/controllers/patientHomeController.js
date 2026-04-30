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
} = require("../models");

const { Op } = require("sequelize");

exports.getHomeData = async (req, res) => {
  try {
    const userId = req.user.id;

    const lang =
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "ar";

    // ── 1. PATIENT ─────────────────────────────
    const patient = await Patient.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["full_name"],
        },
      ],
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // ── 2. STATS ─────────────────────────────
    const [totalDoctors, totalSpecialties, totalPatients] = await Promise.all([
      Doctor.count({ where: { is_approved: true } }),
      Specialty.count(),
      Patient.count(),
    ]);

    // ── 3. SPECIALTIES ────────────────────────
    const specialties = await Specialty.findAll({
      attributes: ["id", "name"],
      limit: 8,
    });

    // ── 4. DOCTORS ─────────────────────────────
    const doctors = await Doctor.findAll({
      where: { is_approved: true },
      include: [
        {
          model: User,
          as: "user", 
          attributes: ["full_name"],
        },
        {
          model: Specialty,
          attributes: ["id", "name"],
        },
        {
          model: Clinic,
          as: "Clinics",
          attributes: ["id", "name", "address"],
          through: {
            attributes: ["day_of_week", "start_time", "end_time"],
          },
          include: [
            {
              model: Wilaya,
              as: "wilaya",
              attributes: ["id", lang === "ar" ? "name_ar" : "name_fr"],
            },
            {
              model: Commune,
              as: "commune",
              attributes: ["id", lang === "ar" ? "name_ar" : "name_fr"],
            },
          ],
        },
      ],
      limit: 6,
      subQuery: false,
    });

    // ── 5. UPCOMING APPOINTMENT ────────────────────────
    const today = new Date().toISOString().split("T")[0];

    const upcomingAppointment = await Appointment.findOne({
      where: {
        patient_id: patient.id,
        appointment_date: { [Op.gte]: today },
        status: { [Op.in]: ["pending", "confirmed"] },
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
          attributes: ["id", "name", "address"],
        },
      ],
    });

    // ── 6. FORMAT DOCTORS ────────────────────────
    const todayName = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });

    const formattedDoctors = doctors.map((d) => {
      const clinic = d.Clinics?.[0];
      const schedule = clinic?.DoctorClinic;

      const wilayaName =
        lang === "ar" ? clinic?.Wilaya?.name_ar : clinic?.Wilaya?.name_fr;

      const communeName =
        lang === "ar" ? clinic?.Commune?.name_ar : clinic?.Commune?.name_fr;

      return {
        id: d.id,
        name: d.User?.full_name || "",
        specialty: d.Specialty?.name || "",
        photo_url: d.photo_url || null,
        location: communeName || wilayaName || clinic?.name || null,

        working_day: schedule?.day_of_week || null,
        start_time: schedule?.start_time || null,
        end_time: schedule?.end_time || null,

        available: schedule?.day_of_week === todayName,
      };
    });

    // FORMAT APPOINTMENT ────────────────────────
    const formattedAppointment = upcomingAppointment
      ? {
          id: upcomingAppointment.id,
          doctor_name: upcomingAppointment.Doctor?.User?.full_name || "",
          specialty: upcomingAppointment.Doctor?.Specialty?.name || "",
          clinic_name: upcomingAppointment.Clinic?.name || "",
          date: upcomingAppointment.appointment_date,
          time: upcomingAppointment.appointment_time,
          status: upcomingAppointment.status,
        }
      : null;

    // ── 8. RESPONSE ────────────────────────
    return res.status(200).json({
      patient: {
        name: patient.user?.full_name || "",
      },
      stats: {
        total_doctors: totalDoctors,
        total_specialties: totalSpecialties,
        total_patients: totalPatients,
      },
      specialties: specialties.map((s) => ({
        id: s.id,
        name: s.name,
      })),
      doctors: formattedDoctors,
      upcoming_appointment: formattedAppointment,
    });
  } catch (err) {
    console.error("Home controller error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
