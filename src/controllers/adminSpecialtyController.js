// src/controllers/adminSpecialtyController.js
const path = require("path");
const fs = require("fs");
const { Specialty } = require("../models");
const { getPagination, getPagingData } = require("../helpers/pagination");

// ── GET /api/admin/specialties ────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const result = await Specialty.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
    });
    res.json(getPagingData(result, page, limit));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── POST /api/admin/specialties ───────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Le nom est requis." });

    const image_url = req.file
      ? `/uploads/specialties/${req.file.filename}`
      : null;

    const specialty = await Specialty.create({ name: name.trim(), image_url });
    res.status(201).json(specialty);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── PUT /api/admin/specialties/:id ────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const specialty = await Specialty.findByPk(req.params.id);
    if (!specialty)
      return res.status(404).json({ message: "Spécialité introuvable." });

    const updateData = {};
    if (req.body.name?.trim()) updateData.name = req.body.name.trim();

    if (req.file) {
      // Delete the old image from disk if extension changed
      const newPath = `/uploads/specialties/${req.file.filename}`;
      if (specialty.image_url && specialty.image_url !== newPath) {
        const oldFile = path.join(__dirname, "../../", specialty.image_url);
        if (fs.existsSync(oldFile)) fs.unlink(oldFile, () => {});
      }
      updateData.image_url = newPath;
    }

    await specialty.update(updateData);
    res.json(specialty);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── DELETE /api/admin/specialties/:id ─────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const specialty = await Specialty.findByPk(req.params.id);
    if (!specialty)
      return res.status(404).json({ message: "Spécialité introuvable." });

    // Delete image file 
    if (specialty.image_url) {
      const file = path.join(__dirname, "../../", specialty.image_url);
      if (fs.existsSync(file)) fs.unlink(file, () => {});
    }

    await specialty.destroy();
    res.json({ message: "Spécialité supprimée." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
