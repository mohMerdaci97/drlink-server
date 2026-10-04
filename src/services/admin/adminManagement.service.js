const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

const ROLES = require("../../constants/roles");

const userRepository = require("../../repositories/admin/user.repository");
const auditService = require("../audit/audit.service");

const getAdminById = async (id) => {
  return userRepository.findOne({
    where: {
      id,
      role: ROLES.ADMIN,
    },
  });
};

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// ─────────────────────────────────────────────────────────────
// GET ALL ADMINS
// ─────────────────────────────────────────────────────────────

exports.getAll = async ({ search, page, limit, offset }) => {
  const where = {
    role: ROLES.ADMIN,
  };

  if (search?.trim()) {
    where.full_name = {
      [Op.iLike]: `%${search.trim()}%`,
    };
  }

  return userRepository.findAndCountAll({
    where,

    attributes: [
      "id",
      "full_name",
      "phone",
      "email",
      "role",
      "is_super",
      "is_active",
      "created_at",
    ],

    limit,
    offset,

    order: [["created_at", "DESC"]],
  });
};

// ─────────────────────────────────────────────────────────────
// CREATE ADMIN
// ─────────────────────────────────────────────────────────────

exports.create = async ({ full_name, phone, email, password, req }) => {
  const existingPhone = await userRepository.findByPhone(phone);

  if (existingPhone) {
    throw createError("Ce numéro est déjà utilisé.", 409);
  }

  if (email) {
    const existingEmail = await userRepository.findByEmail(email);

    if (existingEmail) {
      throw createError("Cette adresse email est déjà utilisée.", 409);
    }
  }

  const password_hash = await bcrypt.hash(password, 12);

  const admin = await userRepository.create({
    full_name,
    phone,
    email: email || null,
    password_hash,
    role: ROLES.ADMIN,
    is_super: false,
    is_active: true,
  });

  await auditService.logRequest({
    req,
    action: "ADMIN_CREATED",
    entityType: "User",
    entityId: admin.id,
    status: "success",
    statusCode: 201,
  });

  return admin;
};

// ─────────────────────────────────────────────────────────────
// UPDATE ADMIN
// ─────────────────────────────────────────────────────────────

exports.update = async (id, data, currentUser, req) => {
  const admin = await getAdminById(id);

  if (!admin) {
    throw createError("Administrateur introuvable.", 404);
  }

  if (admin.id === currentUser.id) {
    throw createError(
      "Vous ne pouvez pas modifier votre propre compte ici.",
      400,
    );
  }

  if (data.phone && data.phone !== admin.phone) {
    const existingPhone = await userRepository.findByPhone(data.phone);

    if (existingPhone && existingPhone.id !== admin.id) {
      throw createError("Ce numéro est déjà utilisé.", 409);
    }
  }

  if (data.email && data.email !== admin.email) {
    const existingEmail = await userRepository.findByEmail(data.email);

    if (existingEmail && existingEmail.id !== admin.id) {
      throw createError("Cette adresse email est déjà utilisée.", 409);
    }
  }

  const updateData = {};

  if (data.full_name !== undefined) {
    updateData.full_name = data.full_name;
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone;
  }

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  const updatedAdmin = await userRepository.update(admin, updateData);

  await auditService.logRequest({
    req,
    action: "ADMIN_UPDATED",
    entityType: "User",
    entityId: admin.id,
    status: "success",
    statusCode: 200,
    metadata: {
      fields: Object.keys(updateData),
    },
  });

  return updatedAdmin;
};

// ─────────────────────────────────────────────────────────────
// TOGGLE ADMIN
// ─────────────────────────────────────────────────────────────

exports.toggle = async (id, currentUser, req) => {
  const admin = await getAdminById(id);

  if (!admin) {
    throw createError("Administrateur introuvable.", 404);
  }

  if (admin.id === currentUser.id) {
    throw createError(
      "Vous ne pouvez pas désactiver votre propre compte.",
      400,
    );
  }

  const newStatus = !admin.is_active;

  const updatedAdmin = await userRepository.update(admin, {
    is_active: newStatus,
  });

  await auditService.logRequest({
    req,
    action: newStatus ? "ADMIN_ACTIVATED" : "ADMIN_DEACTIVATED",
    entityType: "User",
    entityId: admin.id,
    status: "success",
    statusCode: 200,
  });

  return updatedAdmin;
};

// ─────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────

exports.resetPassword = async (id, { password }, currentUser, req) => {
  const admin = await getAdminById(id);

  if (!admin) {
    throw createError("Administrateur introuvable.", 404);
  }

  if (admin.id === currentUser.id) {
    throw createError(
      "Vous ne pouvez pas réinitialiser votre propre mot de passe ici.",
      400,
    );
  }

  const password_hash = await bcrypt.hash(password, 12);

  await userRepository.update(admin, {
    password_hash,
  });

  await auditService.logRequest({
    req,
    action: "ADMIN_PASSWORD_RESET",
    entityType: "User",
    entityId: admin.id,
    status: "success",
    statusCode: 200,
  });

  return {
    message: "Mot de passe réinitialisé avec succès.",
  };
};

// ─────────────────────────────────────────────────────────────
// DELETE ADMIN
// ─────────────────────────────────────────────────────────────

exports.remove = async (id, currentUser, req) => {
  const admin = await getAdminById(id);

  if (!admin) {
    throw createError("Administrateur introuvable.", 404);
  }

  if (admin.id === currentUser.id) {
    throw createError("Vous ne pouvez pas supprimer votre propre compte.", 400);
  }

  if (admin.is_super) {
    throw createError(
      "Un super administrateur ne peut pas être supprimé.",
      403,
    );
  }

  await userRepository.destroy(admin);

  await auditService.logRequest({
    req,
    action: "ADMIN_DELETED",
    entityType: "User",
    entityId: admin.id,
    status: "success",
    statusCode: 200,
  });

  return {
    message: "Administrateur supprimé avec succès.",
  };
};
