const {
  Assistant,
  Doctor,
  Appointment,
  Patient,
  User,
} = require("../../models");
const { Op } = require("sequelize");

exports.getProfile = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name"],
            },
          ],
        },
      ],
    });

    if (!assistant) {
      return res.status(404).json({
        message: "Assistant introuvable.",
      });
    }

    res.json(assistant);
  } catch (err) {
    console.error("=== INTERNAL SERVER ERROR ===");
    console.error("Message:", err.message);
    console.error("Name:", err.name);
    console.error("Stack:", err.stack);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

exports.getTodayAppointments = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
    });

    if (!assistant) {
      return res.status(404).json({
        message: "Assistant introuvable.",
      });
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const appointments = await Appointment.findAll({
      where: {
        doctor_id: assistant.doctor_id,
        appointment_date: todayStr,
      },
      include: [
        {
          model: Patient,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone"],
            },
          ],
        },
      ],
      order: [["appointment_time", "ASC"]],
    });

    res.json(appointments);
  } catch (err) {
    console.error("=== INTERNAL SERVER ERROR ===");
    console.error("Message:", err.message);
    console.error("Name:", err.name);
    console.error("Stack:", err.stack);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
    });

    if (!assistant) {
      return res.status(404).json({
        message: "Assistant introuvable.",
      });
    }

    const appointment = await Appointment.findOne({
      where: {
        id,
        doctor_id: assistant.doctor_id,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Rendez-vous introuvable.",
      });
    }

    appointment.status = status;
    await appointment.save();

    res.json({
      message: "Statut mis à jour.",
      appointment,
    });
  } catch (err) {
    console.error("=== INTERNAL SERVER ERROR ===");
    console.error("Message:", err.message);
    console.error("Name:", err.name);
    console.error("Stack:", err.stack);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({
      where: { user_id: req.user.id },
    });

    if (!assistant) {
      return res.status(404).json({
        message: "Assistant introuvable.",
      });
    }

    const patients = await Patient.findAll({
      include: [
        {
          model: Appointment,
          where: {
            doctor_id: assistant.doctor_id,
          },
          required: true,
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "phone"],
        },
      ],
      distinct: true,
    });

    res.json(patients);
  } catch (err) {
    console.error("=== INTERNAL SERVER ERROR ===");
    console.error("Message:", err.message);
    console.error("Name:", err.name);
    console.error("Stack:", err.stack);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};
