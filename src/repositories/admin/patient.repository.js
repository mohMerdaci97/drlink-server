const { Op } = require("sequelize");

const { User, Patient } = require("../../models");

exports.findAll = async ({ pagination, search }) => {
  const where = {
    role: "patient",
  };

  if (search?.trim()) {
    where.full_name = {
      [Op.iLike]: `%${search.trim()}%`,
    };
  }

  return User.findAndCountAll({
    where,
    attributes: [
      "id",
      "full_name",
      "phone",
      "email",
      "is_active",
      "created_at",
    ],
    include: [
      {
        model: Patient,
        attributes: ["id", "date_of_birth", "gender"],
      },
    ],
    limit: pagination.limit,
    offset: pagination.offset,
    order: [["created_at", "DESC"]],
    distinct: true,
  });
};

exports.findById = async (patientId) => {
  return User.findOne({
    where: {
      id: patientId,
      role: "patient",
    },
    attributes: [
      "id",
      "full_name",
      "phone",
      "email",
      "is_active",
      "created_at",
    ],
    include: [
      {
        model: Patient,
        attributes: ["id", "date_of_birth", "gender"],
      },
    ],
  });
};

exports.findUserById = async (patientId) => {
  return User.findOne({
    where: {
      id: patientId,
      role: "patient",
    },
  });
};

exports.updateUser = async (user, data) => {
  return user.update(data);
};

exports.toggleActive = async (user) => {
  return user.update({
    is_active: !user.is_active,
  });
};
