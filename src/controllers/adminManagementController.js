const bcrypt = require("bcrypt");
const { User } = require("../models");
const { getPagination, getPagingData } = require("../helpers/pagination");
const { Op } = require("sequelize");

// ── Safe attributes no password
const SAFE_ATTRS = [
  "id",
  "full_name",
  "phone",
  "email",
  "is_active",
  "is_super",
  "created_at",
];

exports.getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { search } = req.query;

    const where = { role: "admin" };

    if (search?.trim()) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search.trim()}%` } },
        { email: { [Op.iLike]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      where,
      attributes: SAFE_ATTRS,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json(getPagingData(result, page, limit));
  } catch (err) {
    console.error("getAdmins error:", err);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des admins." });
  }
};

// ── Create
exports.create = async (req, res) => {
  try {
    const { full_name, phone, email, password } = req.body;

    if (!full_name?.trim() || !phone?.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Nom, téléphone et mot de passe requis." });
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 8 caractères et un chiffre.",
      });
    }

    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Ce numéro de téléphone est déjà utilisé." });
    }

    if (email) {
      const emailTaken = await User.findOne({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ message: "Cet email est déjà utilisé." });
      }
    }

    const hash = await bcrypt.hash(password, 12);

    const admin = await User.create({
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      password_hash: hash,
      role: "admin",
      is_active: true,
      is_super: false,
      onboarding_status: "active",
    });

    const { password_hash: _, ...safe } = admin.toJSON();
    res.status(201).json(safe);
  } catch (err) {
    console.error("createAdmin error:", err);
    res.status(500).json({ message: "Erreur lors de la création de l'admin." });
  }
};

exports.update = async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { id: req.params.id, role: "admin" },
    });

    if (!admin) return res.status(404).json({ message: "Admin introuvable." });

    if (admin.is_super && !req.user?.is_super) {
      return res
        .status(403)
        .json({ message: "Impossible de modifier le super administrateur." });
    }

    const { full_name, email, phone } = req.body;

    if (full_name) admin.full_name = full_name.trim();
    if (email) admin.email = email.trim();
    if (phone && phone !== admin.phone) {
      const taken = await User.findOne({
        where: { phone, id: { [Op.ne]: admin.id } },
      });
      if (taken)
        return res.status(409).json({ message: "Numéro déjà utilisé." });
      admin.phone = phone.trim();
    }

    await admin.save();

    const { password_hash: _, ...safe } = admin.toJSON();
    res.json(safe);
  } catch (err) {
    console.error("updateAdmin error:", err);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

// ── PATCH /api/admin/admins/:id/toggle ───────────────────────────────────────
exports.toggle = async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { id: req.params.id, role: "admin" },
    });

    if (!admin) return res.status(404).json({ message: "Admin introuvable." });

    if (admin.id === req.user?.id) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas vous désactiver vous-même." });
    }
    if (admin.is_super) {
      return res
        .status(403)
        .json({ message: "Impossible de désactiver le super administrateur." });
    }

    admin.is_active = !admin.is_active;
    await admin.save();

    res.json({
      message: admin.is_active ? "Admin activé." : "Admin désactivé.",
      is_active: admin.is_active,
    });
  } catch (err) {
    console.error("toggleAdmin error:", err);
    res.status(500).json({ message: "Erreur lors du changement de statut." });
  }
};

// ── PATCH /api/admin/admins/:id/reset-password ───────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { id: req.params.id, role: "admin" },
    });

    if (!admin) return res.status(404).json({ message: "Admin introuvable." });

    if (admin.is_super && !req.user?.is_super) {
      return res.status(403).json({
        message: "Impossible de réinitialiser le mot de passe du super admin.",
      });
    }

    const { password } = req.body;
    if (!password || password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 8 caractères et un chiffre.",
      });
    }

    admin.password_hash = await bcrypt.hash(password, 12);
    await admin.save();

    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ message: "Erreur lors de la réinitialisation." });
  }
};

// ── DELETE /api/admin/admins/:id ──────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const admin = await User.findOne({
      where: { id: req.params.id, role: "admin" },
    });

    if (!admin) return res.status(404).json({ message: "Admin introuvable." });

    if (admin.is_super) {
      return res.status(403).json({
        message: "Le super administrateur ne peut pas être supprimé.",
      });
    }

    if (admin.id === req.user?.id) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
    }

    await admin.destroy();
    res.json({ message: "Admin supprimé." });
  } catch (err) {
    console.error("deleteAdmin error:", err);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
};
