const { Doctor, Specialty } = require("../models");

exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description, specialty_id } = req.body;

    const existing = await Doctor.findOne({ where: { user_id: userId } });
    if (existing) {
      return res.status(400).json({ message: "Profil déjà créé." });
    }

    const doctor = await Doctor.create({
      user_id: userId,
      description,
      specialty_id,
      is_approved: false,
    });

    res.status(201).json({
      message: "Profil médecin créé. En attente de validation admin.",
      doctor,
    });
  } catch (error) {
    console.error("Create doctor profile error:", error);
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
