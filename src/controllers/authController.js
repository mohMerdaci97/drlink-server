const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

exports.register = async (req, res) => {
  try {
    const { full_name, phone, email, password, role } = req.body;

    if (!full_name || !phone || !password || !role) {
      return res.status(400).json({
        message: "Tous les champs obligatoires doivent être remplis.",
      });
    }

    if (!["doctor", "patient"].includes(role)) {
      return res.status(400).json({ message: "Role invalide." });
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Ce numéro de téléphone est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // role based check
    let is_active = true;
    let onboarding_status = "active";

    if (role === "doctor") {
      is_active = false;
      onboarding_status = "pending_profile";
    }

    const user = await User.create({
      full_name,
      phone,
      email,
      password_hash: hashedPassword,
      role,
      is_active,
      onboarding_status,
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      message: `${role === "doctor" ? "Compte médecin créé" : "Compte patient créé"}.`,
      token,
      role: user.role,
      onboarding_status: user.onboarding_status,
      is_active: user.is_active,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors de l'inscription." });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Téléphone et mot de passe requis.",
      });
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(401).json({
        message: "Téléphone ou mot de passe incorrect.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        message: "Téléphone ou mot de passe incorrect.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      message: "Connexion réussie.",
      token,
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur serveur lors de la connexion.",
    });
  }
};
