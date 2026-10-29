const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

const repository = require("../../repositories/assistant/assistantProfile.repository");

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function requireAssistant(userId) {
  const assistant = await repository.findByUserId(userId);

  if (!assistant) {
    throw createError(404, "Profil assistant introuvable.");
  }

  return assistant;
}

exports.getProfile = async (userId) => {
  const assistant = await requireAssistant(userId);

  const stats = assistant.doctor
    ? await repository.getAppointmentStats(assistant.doctor.id)
    : null;

  return {
    id: assistant.id,
    user_id: assistant.user_id,
    full_name: assistant.user?.full_name ?? "—",
    phone: assistant.user?.phone ?? "—",
    email: assistant.user?.email ?? null,
    is_active: assistant.is_active,
    assigned_at: assistant.assigned_at,
    last_active_at: assistant.last_active_at,
    member_since: assistant.user?.created_at ?? null,
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
    stats,
  };
};

exports.updateProfile = async (userId, data) => {
  await requireAssistant(userId);

  const user = await repository.findUserById(userId);

  if (!user) {
    throw createError(404, "Utilisateur introuvable.");
  }

  const fullName = data.full_name?.trim();
  const phone = data.phone?.trim();
  const email = data.email?.trim() || null;

  if (phone && phone !== user.phone) {
    const existing = await repository.findUserByPhoneExcludingId(phone, userId);

    if (existing) {
      throw createError(409, "Ce numéro est déjà utilisé.");
    }
  }

  if (email && email !== user.email) {
    const existing = await repository.findUserByEmailExcludingId(email, userId);

    if (existing) {
      throw createError(409, "Cet email est déjà utilisé.");
    }
  }

  if (fullName) user.full_name = fullName;
  if (phone) user.phone = phone;
  user.email = email;

  await user.save();

  return { message: "Profil mis à jour." };
};

exports.changePassword = async (userId, data) => {
  const { current_password, new_password } = data;

  if (!current_password || !new_password) {
    throw createError(400, "Mot de passe actuel et nouveau requis.");
  }

  if (new_password.length < 8) {
    throw createError(
      400,
      "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    );
  }

  const user = await repository.findUserById(userId);

  if (!user) {
    throw createError(404, "Utilisateur introuvable.");
  }

  const valid = await bcrypt.compare(current_password, user.password_hash);

  if (!valid) {
    throw createError(400, "Mot de passe actuel incorrect.");
  }

  user.password_hash = await bcrypt.hash(new_password, 12);
  await user.save();

  return { message: "Mot de passe modifié avec succès." };
};

exports.resetPassword = async (userId, data) => {
  const { new_password } = data;

  if (!new_password || new_password.length < 8) {
    throw createError(
      400,
      "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    );
  }

  const user = await repository.findUserById(userId);

  if (!user) {
    throw createError(404, "Utilisateur introuvable.");
  }

  user.password_hash = await bcrypt.hash(new_password, 12);
  user.must_change_password = false;

  await user.save();

  return { message: "Mot de passe modifié avec succès." };
};
