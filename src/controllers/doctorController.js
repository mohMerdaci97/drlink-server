const { Doctor, Specialty, User, Wilaya, Commune } = require("../models");

exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description, specialty_id, wilaya_id, commune_id } = req.body;

    if (!specialty_id)
      return res.status(400).json({ message: "La spécialité est requise." });

    if (!wilaya_id)
      return res.status(400).json({ message: "La wilaya est requise." });

    if (!commune_id)
      return res.status(400).json({ message: "La commune est requise." });

    const photo_url = req.file ? `/uploads/doctors/${req.file.filename}` : null;

    const specialty = await Specialty.findByPk(specialty_id);
    if (!specialty)
      return res.status(400).json({ message: "Spécialité invalide." });

    const wilaya = await Wilaya.findByPk(wilaya_id);
    if (!wilaya) return res.status(400).json({ message: "Wilaya invalide." });

    const commune = await Commune.findOne({
      where: { id: commune_id, wilaya_id },
    });
    if (!commune) return res.status(400).json({ message: "Commune invalide." });

    const existing = await Doctor.findOne({ where: { user_id: userId } });

    if (existing) {
      await existing.update({
        description: description?.trim() || null,
        specialty_id: parseInt(specialty_id),
        ...(photo_url ? { photo_url } : {}),
        is_approved: true,
      });
    } else {
      await Doctor.create({
        user_id: userId,
        description: description?.trim() || null,
        specialty_id: parseInt(specialty_id),
        photo_url,
        is_approved: true,
      });
    }

    await User.update(
      { onboarding_status: "active" },
      { where: { id: userId } },
    );
    res.status(201).json({
      message:
        "Profil médecin créé et approuvé. Accès au tableau de bord autorisé.",
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
