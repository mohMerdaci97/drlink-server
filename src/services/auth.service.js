const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const repository = require("../repositories/auth.repository");
const auditService = require("./audit/audit.service");

const ROLES = require("../constants/roles");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokens");

const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT];

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.login = async ({ phone, password, req }) => {
  const normalizedPhone = phone.trim();

  const user = await repository.findByPhone(normalizedPhone);

  // Do not reveal whether the phone exists.
  if (!user) {
    await auditService.logRequest({
      req,
      action: "LOGIN_FAILED",
      status: "failure",
      statusCode: 401,
      metadata: {
        reason: "invalid_credentials",
      },
    });

    throw createError("Identifiants incorrects.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    await auditService.logRequest({
      req,
      action: "LOGIN_FAILED",

      userId: user.id,
      role: user.role,

      entityType: "User",
      entityId: user.id,

      status: "failure",
      statusCode: 401,

      metadata: {
        reason: "invalid_credentials",
      },
    });

    throw createError("Identifiants incorrects.", 401);
  }

  if (!user.is_active) {
    await auditService.logRequest({
      req,
      action: "LOGIN_FAILED",

      userId: user.id,
      role: user.role,

      entityType: "User",
      entityId: user.id,

      status: "failure",
      statusCode: 403,

      metadata: {
        reason: "account_disabled",
      },
    });

    throw createError("Compte désactivé.", 403);
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    await auditService.logRequest({
      req,
      action: "LOGIN_FAILED",

      userId: user.id,
      role: user.role,

      entityType: "User",
      entityId: user.id,

      status: "failure",
      statusCode: 403,

      metadata: {
        reason: "role_not_allowed",
      },
    });

    throw createError("Accès refusé.", 403);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await auditService.logRequest({
    req,
    action: "LOGIN_SUCCESS",

    userId: user.id,
    role: user.role,

    entityType: "User",
    entityId: user.id,

    status: "success",
    statusCode: 200,
  });

  return {
    accessToken,
    refreshToken,

    user: {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      onboarding_status: user.onboarding_status,
      is_super: user.is_super,
    },
  };
};

exports.refresh = async ({ token, req }) => {
  if (!token) {
    throw createError("Refresh token requis.", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const accessToken = generateAccessToken({
      id: decoded.id,
      role: decoded.role,
    });

    await auditService.logRequest({
      req,
      action: "TOKEN_REFRESHED",

      userId: decoded.id,
      role: decoded.role,

      entityType: "User",
      entityId: decoded.id,

      status: "success",
      statusCode: 200,
    });

    return {
      accessToken,
    };
  } catch (error) {
    await auditService.logRequest({
      req,
      action: "TOKEN_REFRESH_FAILED",
      status: "failure",
      statusCode: 401,
      metadata: {
        reason: "invalid_or_expired_refresh_token",
      },
    });

    throw createError("Refresh token invalide ou expiré.", 401);
  }
};

exports.logout = async ({ req }) => {
  if (req.user?.id) {
    await auditService.logRequest({
      req,
      action: "LOGOUT",

      userId: req.user.id,
      role: req.user.role,

      entityType: "User",
      entityId: req.user.id,

      status: "success",
      statusCode: 200,
    });
  }

  return {
    message: "Déconnexion réussie.",
  };
};

exports.me = async (userId) => {
  const user = await repository.findById(userId);

  if (!user) {
    throw createError("Utilisateur introuvable.", 404);
  }

  return user;
};
