const {
  Appointment,
  Doctor,
  User,
  Specialty,
  Clinic,
  Patient,
} = require("../../models");
const { Op } = require("sequelize");

// ── POST /patient/appointments ───────────────
exports.createAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doctor_id, clinic_id, appointment_date, appointment_time } =
      req.body;

    if (!doctor_id || !clinic_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: "All fields required" });
    }

    // get patient
    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // check slot still available
    const conflict = await Appointment.findOne({
      where: {
        doctor_id,
        clinic_id,
        appointment_date,
        appointment_time,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });

    if (conflict) {
      return res.status(409).json({ message: "Slot already booked" });
    }

    // check patient doesn't have appointment same time
    const patientConflict = await Appointment.findOne({
      where: {
        patient_id: patient.id,
        appointment_date,
        appointment_time,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });

    if (patientConflict) {
      return res
        .status(409)
        .json({ message: "You already have an appointment at this time" });
    }

    const appointment = await Appointment.create({
      patient_id: patient.id,
      doctor_id,
      clinic_id,
      appointment_date,
      appointment_time,
      status: "pending",
    });

    return res.status(201).json({
      id: appointment.id,
      status: appointment.status,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
    });
  } catch (err) {
    console.error("createAppointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /patient/appointments ────────────────
exports.getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const where = { patient_id: patient.id };
    if (status) where.status = status;

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        {
          model: Doctor,
          include: [
            { model: User, as: "user", attributes: ["full_name"] },
            { model: Specialty, attributes: ["name"] },
          ],
        },
        { model: Clinic, attributes: ["id", "name", "address"] },
      ],
      order: [
        ["appointment_date", "DESC"],
        ["appointment_time", "DESC"],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const appointments = rows.map((a) => ({
      id: a.id,
      status: a.status,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      doctor_name: a.Doctor?.user?.full_name,
      specialty: a.Doctor?.Specialty?.name,
      clinic_name: a.Clinic?.name,
      clinic_address: a.Clinic?.address,
    }));

    return res.json({
      appointments,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error("getMyAppointments error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── PATCH /patient/appointments/:id/cancel ───
exports.cancelAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const appointment = await Appointment.findOne({
      where: { id, patient_id: patient.id },
    });

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res
        .status(400)
        .json({ message: "Cannot cancel this appointment" });
    }

    await appointment.update({ status: "cancelled" });

    return res.json({ message: "Appointment cancelled", id: appointment.id });
  } catch (err) {
    console.error("cancelAppointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
