const bcrypt = require("bcrypt");
const { User, Assistant, Doctor } = require("../../models");
const { Op } = require("sequelize");

const getDoctor = async (userId) => {
  return Doctor.findOne({ where: { user_id: userId } });
};
/**
 * GET ONE ASSISTANT
 */
exports.getOne = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    if (!doctor)
      return res.status(404).json({ message: "Doctor introuvable." });

    const assistant = await Assistant.findOne({
      where: {
        id: req.params.id,
        doctor_id: doctor.id,
      },
      include: [
        {
          model: User,
          attributes: ["id", "full_name", "phone", "is_active"],
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
    console.error("getOne assistant:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
/**
 * CREATE ASSISTANT
 */
exports.createAssistant = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor introuvable." });
    }

    const { full_name, phone, password } = req.body;

    if (!full_name || !phone || !password) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ message: "Téléphone déjà utilisé." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name,
      phone,
      password_hash,
      role: "assistant",
      is_active: true,
      onboarding_status: "active",
    });

    const assistant = await Assistant.create({
      user_id: user.id,
      doctor_id: doctor.id,
      is_active: true,
      assigned_at: new Date(),
    });

    return res.status(201).json({
      message: "Assistant créé avec succès",
      assistant,
      user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * GET ALL ASSISTANTS (doctor scope)
 */
exports.getAssistants = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);
    if (!doctor)
      return res.status(404).json({ message: "Doctor introuvable." });

    const assistants = await Assistant.findAll({
      where: { doctor_id: doctor.id },
      include: [
        {
          model: User,
          attributes: ["id", "full_name", "phone", "is_active"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(assistants);
  } catch (err) {
    console.error("getAssistants:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * UPDATE ASSISTANT (activate/deactivate + info user)
 */
exports.updateAssistant = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const assistant = await Assistant.findOne({
      where: {
        id: req.params.id,
        doctor_id: doctor.id,
      },
      include: [{ model: User, as: "user" }],
    });

    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    const {
      full_name,
      phone,
      email,
      password,
      is_active,
      assistant_active,
      last_active_at,
    } = req.body;

    // USER updates
    if (full_name) assistant.user.full_name = full_name;
    if (phone) assistant.user.phone = phone;
    if (email) assistant.user.email = email;

    if (password) {
      assistant.user.password_hash = await bcrypt.hash(password, 10);
    }

    if (typeof is_active === "boolean") {
      assistant.user.is_active = is_active;
    }

    // ASSISTANT updates
    if (typeof assistant_active === "boolean") {
      assistant.is_active = assistant_active;
    }

    if (last_active_at) {
      assistant.last_active_at = new Date(last_active_at);
    }

    await assistant.user.save();
    await assistant.save();

    res.json({
      message: "Assistant mis à jour avec succès",
      assistant,
    });
  } catch (err) {
    console.error("updateAssistant:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
/**
 * DELETE ASSISTANT
 */
exports.deleteAssistant = async (req, res) => {
  try {
    const doctor = await getDoctor(req.user.id);

    const assistant = await Assistant.findOne({
      where: {
        id: req.params.id,
        doctor_id: doctor.id,
      },
      include: [User],
    });

    if (!assistant)
      return res.status(404).json({ message: "Assistant introuvable." });

    await assistant.destroy();
    await assistant.User.destroy();

    res.json({ message: "Assistant supprimé." });
  } catch (err) {
    console.error("deleteAssistant:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
