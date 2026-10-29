const { Op, fn, col, where: sqlWhere } = require("sequelize");
const { User, Patient, RefreshToken } = require("../../models");

const USER_ATTRS = ["id", "full_name", "email", "phone", "role", "is_active"];

//  Users

// Email is compared in lower case
exports.findUserByEmail = async (email) => {
  return User.findOne({
    where: sqlWhere(fn("LOWER", col("email")), email),
  });
};

exports.findUserByPhone = async (phone) => {
  return User.findOne({ where: { phone } });
};

exports.findUserById = async (userId) => {
  return User.findByPk(userId, { attributes: USER_ATTRS });
};

exports.createUser = async (data, options = {}) => {
  return User.create(data, options);
};

exports.createPatient = async (data, options = {}) => {
  return Patient.create(data, options);
};

//  Refresh tokens

exports.createRefreshToken = async (data, options = {}) => {
  return RefreshToken.create(data, options);
};

exports.findRefreshToken = async (tokenHash) => {
  return RefreshToken.findOne({ where: { token_hash: tokenHash } });
};

// Returns the number of rows changed (0 = already revoked)
exports.revokeRefreshTokenIfActive = async (id, transaction) => {
  const [affected] = await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { id, revoked_at: null }, transaction },
  );

  return affected;
};

exports.revokeRefreshTokenByHash = async (tokenHash) => {
  const [affected] = await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { token_hash: tokenHash, revoked_at: null } },
  );

  return affected;
};

exports.revokeAllRefreshTokens = async (userId) => {
  const [affected] = await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null } },
  );

  return affected;
};

exports.deleteExpiredRefreshTokens = async (userId) => {
  return RefreshToken.destroy({
    where: { user_id: userId, expires_at: { [Op.lt]: new Date() } },
  });
};
