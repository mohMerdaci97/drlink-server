const bcrypt = require("bcrypt");
const {
  User,
  Assistant,
  Doctor,
  Specialty,
  Appointment,
} = require("../../models");
const { Op } = require("sequelize");

// ─────────────────────────────────────────────────────────────────────────────
// Get assistant with user + assigned doctor
// ─────────────────────────────────────────────────────────────────────────────

async function getAssistantWithUser(userId) {
  const assistant = await Assistant.findOne({
    where: { user_id: userId },

    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "phone", "email", "created_at"],
      },

      {
        model: Doctor,
        as: "doctor",
        attributes: [
          "id",
          "user_id",
          "description",
          "photo_url",
          "is_approved",
        ],

        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "full_name", "phone", "email"],
          },

          {
            model: Specialty,
            attributes: ["id", "name"],
          },
        ],
      },
    ],
  });

  if (!assistant) {
    throw {
      status: 404,
      message: "Profil assistant introuvable.",
    };
  }

  return assistant;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assistant/profile
// ─────────────────────────────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  try {
    const assistant = await getAssistantWithUser(req.user.id);

    const doctorId = assistant.doctor_id;

    const [
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      confirmedAppointments,
      uniquePatients,
    ] = await Promise.all([
      Appointment.count({
        where: {
          doctor_id: doctorId,
        },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
          status: "completed",
        },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
          status: "cancelled",
        },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
          status: "pending",
        },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
          status: "confirmed",
        },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
        },
        distinct: true,
        col: "patient_id",
      }),
    ]);

    res.json({
      id: assistant.id,
      user_id: assistant.user_id,

      // ── Assistant information ─────────────────────────────────────
      full_name: assistant.user?.full_name ?? "—",
      phone: assistant.user?.phone ?? "—",
      email: assistant.user?.email ?? null,

      is_active: assistant.is_active,
      assigned_at: assistant.assigned_at,
      last_active_at: assistant.last_active_at,

      member_since: assistant.user?.created_at ?? null,

      // ── Assigned doctor ────────────────────────────────────────────
      doctor: assistant.doctor
        ? {
            id: assistant.doctor.id,
            user_id: assistant.doctor.user_id,

            full_name: assistant.doctor.user?.full_name ?? "—",
            phone: assistant.doctor.user?.phone ?? "—",
            email: assistant.doctor.user?.email ?? null,

            description: assistant.doctor.description ?? null,
            photo_url: assistant.doctor.photo_url ?? null,

            specialty: assistant.doctor.Specialty ?? null,
          }
        : null,

      // ── Statistics ─────────────────────────────────────────────────
      stats: {
        total_appointments: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
        unique_patients: uniquePatients,

        completion_rate:
          totalAppointments > 0
            ? Math.round((completedAppointments / totalAppointments) * 100)
            : 0,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("assistantProfile.getProfile:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assistant/profile
// ─────────────────────────────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const assistant = await getAssistantWithUser(req.user.id);

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    const { full_name, phone, email } = req.body;

    // ── Check phone uniqueness ───────────────────────────────────────
    if (phone && phone !== user.phone) {
      const exists = await User.findOne({
        where: {
          phone,
          id: {
            [Op.ne]: user.id,
          },
        },
      });

      if (exists) {
        return res.status(400).json({
          message: "Ce numéro est déjà utilisé.",
        });
      }
    }

    // ── Check email uniqueness ───────────────────────────────────────
    if (email && email !== user.email) {
      const exists = await User.findOne({
        where: {
          email,
          id: {
            [Op.ne]: user.id,
          },
        },
      });

      if (exists) {
        return res.status(400).json({
          message: "Cet email est déjà utilisé.",
        });
      }
    }

    // ── Update User ──────────────────────────────────────────────────
    if (full_name?.trim()) {
      user.full_name = full_name.trim();
    }

    if (phone?.trim()) {
      user.phone = phone.trim();
    }

    user.email = email?.trim() || null;

    await user.save();

    res.json({
      message: "Profil mis à jour.",
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        message: err.message,
      });
    }

    console.error("assistantProfile.updateProfile:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assistant/profile/password
// ─────────────────────────────────────────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        message: "Mot de passe actuel et nouveau requis.",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);

    if (!valid) {
      return res.status(400).json({
        message: "Mot de passe actuel incorrect.",
      });
    }

    user.password_hash = await bcrypt.hash(new_password, 12);

    await user.save();

    res.json({
      message: "Mot de passe modifié avec succès.",
    });
  } catch (err) {
    console.error("assistantProfile.changePassword:", err);

    res.status(500).json({
      message: "Erreur serveur.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assistant/profile/reset-password
// ─────────────────────────────────────────────────────────────────────────────

exports.resetPassword = async (req, res) => {
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters.",
    });
  }

  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);

    user.must_change_password = false;

    await user.save();

    res.json({
      message: "Password updated.",
    });
  } catch (err) {
    console.error("assistantProfile.resetPassword:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
