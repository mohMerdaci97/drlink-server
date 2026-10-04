const bcrypt = require("bcrypt");
const userRepository = require("../../repositories/admin/user.repository");

exports.getProfile = async (userId) => {
  const user = await userRepository.findByIdSafe(userId);

  if (!user) {
    const error = new Error("Utilisateur introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

exports.updateProfile = async (userId, data) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("Utilisateur introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const { full_name, email, phone } = data;

  const updateData = {};

  if (full_name?.trim()) {
    updateData.full_name = full_name.trim();
  }

  if (email?.trim()) {
    updateData.email = email.trim();
  }

  if (phone?.trim() && phone.trim() !== user.phone) {
    const existingUser = await userRepository.findByPhone(phone.trim());

    if (existingUser && existingUser.id !== user.id) {
      const error = new Error("Ce numéro est déjà utilisé.");
      error.statusCode = 409;
      throw error;
    }

    updateData.phone = phone.trim();
  }

  const updatedUser = await userRepository.update(user, updateData);

  const safeUser = await userRepository.findByIdSafe(updatedUser.id);

  return {
    message: "Profil mis à jour.",
    user: safeUser,
  };
};

exports.changePassword = async (userId, data) => {
  const { current_password, new_password } = data;

  if (!current_password || !new_password) {
    const error = new Error("Mot de passe actuel et nouveau requis.");
    error.statusCode = 400;
    throw error;
  }

  if (new_password.length < 8) {
    const error = new Error(
      "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!/\d/.test(new_password)) {
    const error = new Error(
      "Le nouveau mot de passe doit contenir au moins un chiffre.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (current_password === new_password) {
    const error = new Error(
      "Le nouveau mot de passe doit être différent de l'actuel.",
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findById(userId);

  if (!user) {
    const error = new Error("Utilisateur introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(current_password, user.password_hash);

  if (!isMatch) {
    const error = new Error("Mot de passe actuel incorrect.");
    error.statusCode = 401;
    throw error;
  }

  const passwordHash = await bcrypt.hash(new_password, 12);

  await userRepository.update(user, {
    password_hash: passwordHash,
  });

  return {
    message: "Mot de passe modifié avec succès.",
  };
};
