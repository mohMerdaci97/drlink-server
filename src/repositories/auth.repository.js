const { User } = require("../models");

exports.findByPhone = async (phone) => {
  return User.findOne({
    where: {
      phone,
    },
  });
};

exports.findById = async (id) => {
  return User.findByPk(id, {
    attributes: ["id", "full_name", "role", "onboarding_status", "is_super"],
  });
};
