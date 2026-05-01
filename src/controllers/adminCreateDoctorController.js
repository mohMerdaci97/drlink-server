const bcrypt = require("bcrypt");
const { User, Doctor } = require("../models");
const { Op } = require("sequelize");

exports.createDoctor = async (req, res) => {
  try {
    const { full_name, phone, email, temp_password } = req.body;

    if (!full_name?.trim())
      return res.status(400).json({ message: "Nom complet requis." });
    if (!phone?.trim())
      return res.status(400).json({ message: "Téléphone requis." });
    if (!temp_password || temp_password.length < 6)
      return res.status(400).json({
        message: "Mot de passe temporaire requis (min 6 caractères).",
      });

    // Check phone uniqueness
    const existing = await User.findOne({ where: { phone: phone.trim() } });
    if (existing)
      return res.status(409).json({ message: "Ce numéro est déjà utilisé." });

    // Check email uniqueness if provided
    if (email?.trim()) {
      const emailExists = await User.findOne({
        where: { email: email.trim(), id: { [Op.ne]: 0 } },
      });
      if (emailExists)
        return res.status(409).json({ message: "Cet email est déjà utilisé." });
    }

    const password_hash = await bcrypt.hash(temp_password, 12);

    const user = await User.create({
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      password_hash,
      role: "doctor",
      is_active: false,
      onboarding_status: "pending_profile",
      must_change_password: true,
    });

    await Doctor.create({ user_id: user.id });

    return res.status(201).json({
      message:
        "Compte médecin créé. Le médecin peut maintenant se connecter et compléter son profil.",
      doctor: {
        user_id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("adminCreateDoctor:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
