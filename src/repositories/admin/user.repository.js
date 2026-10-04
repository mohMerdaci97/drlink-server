const { User } = require("../../models");

const SAFE_ATTRS = [
  "id",
  "full_name",
  "phone",
  "email",
  "role",
  "is_super",
  "is_active",
  "created_at",
];

exports.findById = async (userId) => {
  return User.findByPk(userId);
};

exports.findByIdSafe = async (userId) => {
  return User.findByPk(userId, {
    attributes: SAFE_ATTRS,
  });
};

exports.findByPhone = async (phone) => {
  return User.findOne({
    where: { phone },
  });
};

exports.findByEmail = async (email) => {
  return User.findOne({
    where: { email },
  });
};

exports.findOne = async (options) => {
  return User.findOne(options);
};

exports.findAll = async (options) => {
  return User.findAll(options);
};

exports.findAndCountAll = async (options) => {
  return User.findAndCountAll(options);
};

exports.create = async (data, options = {}) => {
  return User.create(data, options);
};

exports.update = async (user, data, options = {}) => {
  return user.update(data, options);
};

exports.destroy = async (user, options = {}) => {
  return user.destroy(options);
};
