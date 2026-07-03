const {
  Assistant,
  Doctor,
  Appointment,
  Patient,
  User,
} = require("../../models");
const { Op } = require("sequelize");

// GET ASSISTANT PROFILE
exports.getProfile = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Doctor,
          as: "doctor",
          include: [
            { model: User, as: "user", attributes: ["id", "full_name"] },
          ],
        },
      ],
    });

    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    res.json(assistant);
  } catch (err) {
    console.error("assistant getProfile:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// GET TODAY APPOINTMENTS
exports.getTodayAppointments = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
    });

    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const appointments = await Appointment.findAll({
      where: {
        doctor_id: assistant.doctor_id,
        created_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
      include: [
        {
          model: Patient,
          include: [{ model: User, attributes: ["full_name", "phone"] }],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    res.json(appointments);
  } catch (err) {
    console.error("assistant today appointments:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// UPDATE APPOINTMENT STATUS

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
    });

    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const appointment = await Appointment.findOne({
      where: {
        id,
        doctor_id: assistant.doctor_id,
      },
    });

    if (!appointment)
      return res.status(404).json({ message: "Rendez-vous introuvable." });

    appointment.status = status;
    await appointment.save();

    res.json({
      message: "Statut mis à jour.",
      appointment,
    });
  } catch (err) {
    console.error("assistant updateAppointment:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// GET DOCTOR PATIENTS (read-only)

exports.getPatients = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
    });

    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const patients = await Patient.findAll({
      include: [
        {
          model: Appointment,
          where: { doctor_id: assistant.doctor_id },
          required: true,
        },
        {
          model: User,
          attributes: ["id", "full_name", "phone"],
        },
      ],
      distinct: true,
    });

    res.json(patients);
  } catch (err) {
    console.error("assistant patients:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
