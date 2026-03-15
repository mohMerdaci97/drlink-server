// src/middleware/requireSuperAdmin.js
const { User } = require("../models");

module.exports = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "role", "is_super", "is_active"],
    });

    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Compte désactivé." });
    }

    if (user.role !== "admin" || !user.is_super) {
      return res
        .status(403)
        .json({ message: "Accès réservé au super administrateur." });
    }

    req.user.is_super = true;
    next();
  } catch (err) {
    console.error("requireSuperAdmin error:", err);
    res.status(500).json({ message: "Erreur d'autorisation." });
  }
};
