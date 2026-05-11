const {
  Appointment,
  Doctor,
  User,
  Specialty,
  Clinic,
  Patient,
} = require("../../models");
const { Op } = require("sequelize");

exports.getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    const where = { patient_id: patient.id };
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        {
          model: Doctor,

          required: false,
          include: [
            {
              model: User,
              as: "user", 
              attributes: ["full_name", "phone"],
              required: false,
            },
            {
              model: Specialty,
              attributes: ["id", "name"],
              required: false,
            },
          ],
        },
        {
          model: Clinic,
   
        
          attributes: ["id", "name", "address", "phone"],
          required: false,
        },
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
      doctor_name: a.Doctor?.user?.full_name ?? null,
      specialty: a.Doctor?.Specialty?.name ?? null,
      photo_url: a.Doctor?.photo_url ?? null,
      clinic_name: a.Clinic?.name ?? null,
      clinic_address: a.Clinic?.address ?? null,
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

exports.createAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doctor_id, clinic_id, appointment_date, appointment_time } =
      req.body;

    if (!doctor_id || !clinic_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: "All fields required" });
    }

    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // slot conflict check
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

    // patient double-booking check
    const patientConflict = await Appointment.findOne({
      where: {
        patient_id: patient.id,
        appointment_date,
        appointment_time,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    if (patientConflict) {
      return res.status(409).json({
        message: "You already have an appointment at this time",
      });
    }

    const appt = await Appointment.create({
      patient_id: patient.id,
      doctor_id,
      clinic_id,
      appointment_date,
      appointment_time,
      status: "pending",
    });

    return res.status(201).json({
      id: appt.id,
      status: appt.status,
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
    });
  } catch (err) {
    console.error("createAppointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const patient = await Patient.findOne({ where: { user_id: userId } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const appt = await Appointment.findOne({
      where: { id, patient_id: patient.id },
    });
    if (!appt)
      return res.status(404).json({ message: "Appointment not found" });

    if (!["pending", "confirmed"].includes(appt.status)) {
      return res
        .status(400)
        .json({ message: "Cannot cancel this appointment" });
    }

    await appt.update({ status: "cancelled" });
    return res.json({ message: "Cancelled", id: appt.id });
  } catch (err) {
    console.error("cancelAppointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
