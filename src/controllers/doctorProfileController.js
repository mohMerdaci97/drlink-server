const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const {
  User,
  Doctor,
  Specialty,
  Appointment,
  DoctorClinic,
} = require("../models");
const { Op } = require("sequelize");

async function getDoctorWithUser(userId) {
  const doctor = await Doctor.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        attributes: ["id", "full_name", "phone", "email", "created_at"],
      },
      { model: Specialty, attributes: ["id", "name"] },
    ],
  });
  if (!doctor) throw { status: 404, message: "Profil médecin introuvable." };
  return doctor;
}

// ── GET /api/doctor/profile ───────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const doctor = await getDoctorWithUser(req.user.id);

    const [total, completed, cancelled, uniquePatients, clinicCount] =
      await Promise.all([
        Appointment.count({ where: { doctor_id: doctor.id } }),
        Appointment.count({
          where: { doctor_id: doctor.id, status: "completed" },
        }),
        Appointment.count({
          where: { doctor_id: doctor.id, status: "cancelled" },
        }),
        Appointment.count({
          where: { doctor_id: doctor.id },
          distinct: true,
          col: "patient_id",
        }),
        DoctorClinic.count({
          where: { doctor_id: doctor.id },
          distinct: true,
          col: "clinic_id",
        }),
      ]);

    res.json({
      id: doctor.id,
      user_id: doctor.user_id,
      full_name: doctor.User?.full_name ?? "—",
      phone: doctor.User?.phone ?? "—",
      email: doctor.User?.email ?? null,
      description: doctor.description ?? null,
      photo_url: doctor.photo_url ?? null,
      is_approved: doctor.is_approved,
      specialty: doctor.Specialty ?? null,
      member_since: doctor.User?.created_at ?? null,
      stats: {
        total_appointments: total,
        completed,
        cancelled,
        unique_patients: uniquePatients,
        clinic_count: clinicCount,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorProfile.getProfile:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── PATCH /api/doctor/profile ─────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const doctor = await getDoctorWithUser(req.user.id);
    const user = await User.findByPk(req.user.id);
    const { full_name, phone, email, description } = req.body;

    // Phone uniqueness check
    if (phone && phone !== user.phone) {
      const exists = await User.findOne({
        where: { phone, id: { [Op.ne]: user.id } },
      });
      if (exists)
        return res.status(400).json({ message: "Ce numéro est déjà utilisé." });
    }
    // Email uniqueness check
    if (email && email !== user.email) {
      const exists = await User.findOne({
        where: { email, id: { [Op.ne]: user.id } },
      });
      if (exists)
        return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    if (full_name?.trim()) user.full_name = full_name.trim();
    if (phone?.trim()) user.phone = phone.trim();
    user.email = email?.trim() || null;
    await user.save();

    if (description !== undefined) {
      doctor.description = description?.trim() || null;
      await doctor.save();
    }

    res.json({ message: "Profil mis à jour." });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    console.error("doctorProfile.updateProfile:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── PATCH /api/doctor/profile/photo ──────────────────────────────────────────
exports.updatePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Aucune photo fournie." });
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (!doctor)
      return res.status(404).json({ message: "Profil médecin introuvable." });

    const newPhotoUrl = `/uploads/doctors/${req.file.filename}`;

    if (doctor.photo_url && doctor.photo_url !== newPhotoUrl) {
      const oldFilePath = path.join(__dirname, "../../", doctor.photo_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, (err) => {
          if (err) console.warn("Could not delete old photo:", err.message);
        });
      }
    }

    doctor.photo_url = newPhotoUrl;
    await doctor.save();

    res.json({ message: "Photo mise à jour.", photo_url: doctor.photo_url });
  } catch (err) {
    console.error("doctorProfile.updatePhoto:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── PATCH /api/doctor/profile/password ───────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res
        .status(400)
        .json({ message: "Mot de passe actuel et nouveau requis." });
    if (new_password.length < 8)
      return res.status(400).json({
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      });

    const user = await User.findByPk(req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid)
      return res
        .status(400)
        .json({ message: "Mot de passe actuel incorrect." });

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    res.json({ message: "Mot de passe modifié avec succès." });
  } catch (err) {
    console.error("doctorProfile.changePassword:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.resetPassword = async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });

  try {
    const user = await User.findByPk(req.user.id);
    user.password_hash = await bcrypt.hash(new_password, 10);
    user.must_change_password = false;
    await user.save();
    res.json({ message: "Password updated." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
