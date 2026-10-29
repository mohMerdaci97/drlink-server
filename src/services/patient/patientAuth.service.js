const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sequelize } = require("../../models");
const ROLES = require("../../constants/roles");
const createError = require("../../helpers/httpError");
const hashToken = require("../../helpers/hashToken");
const { generateAccessToken } = require("../../utils/tokens");
const patientAuthRepository = require("../../repositories/patient/patientAuth.repository");
const {
  BCRYPT_ROUNDS,
  REFRESH_TOKEN_DAYS,
  REFRESH_REUSE_GRACE_SECONDS,
} = require("../../constants/auth");

// Compared when the email does not exist, so the response time is the same
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);



const formatUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
});

const invalidSession = () => createError(401, "Session invalide.");

// New access token + new refresh token (only its hash is stored)
const issueTokens = async (user, transaction) => {
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );

  await patientAuthRepository.createRefreshToken(
    {
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: expiresAt,
    },
    { transaction },
  );

  return {
    accessToken: generateAccessToken({ id: user.id, role: user.role }),
    refreshToken,
  };
};

// ── Service ─────────────────────────────────────────

exports.register = async (data) => {
  const { full_name, password } = data;
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();

  if (await patientAuthRepository.findUserByEmail(email)) {
    throw createError(409, "Cet email est déjà utilisé.");
  }

  if (await patientAuthRepository.findUserByPhone(phone)) {
    throw createError(409, "Ce numéro est déjà utilisé.");
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const transaction = await sequelize.transaction();

  try {
    const user = await patientAuthRepository.createUser(
      {
        full_name: full_name.trim(),
        email,
        phone,
        password_hash,
        role: ROLES.PATIENT,
        is_active: true,
      },
      { transaction },
    );

    await patientAuthRepository.createPatient(
      { user_id: user.id },
      { transaction },
    );

    // The patient is logged in right after sign up
    const tokens = await issueTokens(user, transaction);

    await transaction.commit();

    return {
      success: true,
      message: "Compte patient créé avec succès.",
      user: formatUser(user),
      ...tokens,
    };
  } catch (error) {
    await transaction.rollback();

    // Two sign ups at the same time: the database unique index decides
    if (error.name === "SequelizeUniqueConstraintError") {
      throw createError(409, "Email ou numéro déjà utilisé.");
    }

    throw error;
  }
};

exports.login = async ({ email, password }) => {
  const user = await patientAuthRepository.findUserByEmail(
    email.trim().toLowerCase(),
  );

  // Always run bcrypt, even for unknown emails (same response time)
  const isMatch = await bcrypt.compare(
    password,
    user?.password_hash || DUMMY_HASH,
  );

  if (!user || user.role !== ROLES.PATIENT || !isMatch) {
    throw createError(401, "Identifiants invalides.");
  }

  // Checked after the password so it is not shown to strangers
  if (!user.is_active) throw createError(403, "Compte désactivé.");

  await patientAuthRepository.deleteExpiredRefreshTokens(user.id);

  const tokens = await issueTokens(user);

  return { success: true, ...tokens, user: formatUser(user) };
};

// Each refresh token works once: it is replaced by a new one
exports.refresh = async (refreshToken) => {
  const stored = await patientAuthRepository.findRefreshToken(
    hashToken(refreshToken),
  );

  if (!stored) throw invalidSession();

  if (stored.revoked_at) {
    // Just after a rotation it is a normal retry. Later it looks like theft.
    const ageSeconds =
      (Date.now() - new Date(stored.revoked_at).getTime()) / 1000;

    if (ageSeconds > REFRESH_REUSE_GRACE_SECONDS) {
      await patientAuthRepository.revokeAllRefreshTokens(stored.user_id);
    }

    throw invalidSession();
  }

  if (new Date(stored.expires_at) <= new Date()) throw invalidSession();

  const user = await patientAuthRepository.findUserById(stored.user_id);

  if (!user || !user.is_active || user.role !== ROLES.PATIENT) {
    await patientAuthRepository.revokeAllRefreshTokens(stored.user_id);
    throw invalidSession();
  }

  const transaction = await sequelize.transaction();

  try {
    // Only one request pass
    const affected = await patientAuthRepository.revokeRefreshTokenIfActive(
      stored.id,
      transaction,
    );

    if (!affected) throw invalidSession();

    const tokens = await issueTokens(user, transaction);

    await transaction.commit();

    return tokens;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.logout = async (refreshToken) => {
  if (refreshToken) {
    await patientAuthRepository.revokeRefreshTokenByHash(
      hashToken(refreshToken),
    );
  }

  return { message: "Déconnexion réussie." };
};

// Log out from every device
exports.logoutAll = async (userId) => {
  await patientAuthRepository.revokeAllRefreshTokens(userId);

  return { message: "Déconnecté de tous les appareils." };
};

exports.me = async (userId) => {
  const user = await patientAuthRepository.findUserById(userId);

  if (!user) throw createError(404, "Utilisateur introuvable.");

  if (!user.is_active) throw createError(403, "Compte désactivé.");

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
};
