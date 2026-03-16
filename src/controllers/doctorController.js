const { Doctor, Specialty, User } = require("../models");

exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description, specialty_id } = req.body;

    if (!description?.trim()) {
      return res.status(400).json({ message: "La description est requise." });
    }
    if (!specialty_id) {
      return res.status(400).json({ message: "La spécialité est requise." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "La photo est requise." });
    }

    // Check if profile already exists
    const existing = await Doctor.findOne({ where: { user_id: userId } });
    if (existing) {
      return res.status(400).json({ message: "Profil déjà créé." });
    }

    // Check specialty exists
    const specialty = await Specialty.findByPk(specialty_id);
    if (!specialty) {
      return res.status(400).json({ message: "Spécialité invalide." });
    }

    const photo_url = `/uploads/doctors/${req.file.filename}`;

    const doctor = await Doctor.create({
      user_id: userId,
      description: description.trim(),
      specialty_id,
      photo_url,
      is_approved: false,
    });

    // Update user onboarding status
    await User.update(
      { onboarding_status: "pending_approval" },
      { where: { id: userId } },
    );

    res.status(201).json({
      message: "Profil médecin créé. En attente de validation admin.",
      doctor,
    });
  } catch (error) {
    console.error("createProfile error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.getDoctorSpecialities = async (_, res) => {
  try {
    const specialties = await Specialty.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    res.json(specialties);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
};
