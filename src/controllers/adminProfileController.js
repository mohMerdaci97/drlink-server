const bcrypt = require("bcrypt");
const { User } = require("../models");

const SAFE_ATTRS = [
  "id",
  "full_name",
  "phone",
  "email",
  "role",
  "is_super",
  "is_active",
  "created_at",
];

// ── GET profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: SAFE_ATTRS });
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });
    res.json(user);
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// PATCH profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const { full_name, email, phone } = req.body;

    if (full_name?.trim()) user.full_name = full_name.trim();
    if (email?.trim()) user.email = email.trim();

    // Phone uniqueness check
    if (phone?.trim() && phone.trim() !== user.phone) {
      const taken = await User.findOne({
        where: {
          phone: phone.trim(),
          id: { [require("sequelize").Op.ne]: user.id },
        },
      });
      if (taken)
        return res.status(409).json({ message: "Ce numéro est déjà utilisé." });
      user.phone = phone.trim();
    }

    await user.save();

    const { password_hash: _, ...safe } = user.toJSON();
    res.json({ message: "Profil mis à jour.", user: safe });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

// ── PATCH profile/password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ message: "Mot de passe actuel et nouveau requis." });
    }
    if (new_password.length < 8) {
      return res.status(400).json({
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      });
    }
    if (!/\d/.test(new_password)) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins un chiffre.",
      });
    }
    if (current_password === new_password) {
      return res.status(400).json({
        message: "Le nouveau mot de passe doit être différent de l'actuel.",
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Mot de passe actuel incorrect." });
    }

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    res.json({ message: "Mot de passe modifié avec succès." });
  } catch (err) {
    console.error("changePassword error:", err);
    res
      .status(500)
      .json({ message: "Erreur lors du changement de mot de passe." });
  }
};
