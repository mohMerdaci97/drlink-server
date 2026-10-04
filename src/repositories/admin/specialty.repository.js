const { Specialty } = require("../../models");

exports.findAll = async ({ pagination }) => {
  return Specialty.findAndCountAll({
    limit: pagination.limit,
    offset: pagination.offset,
    order: [["id", "DESC"]],
  });
};

exports.findById = async (id) => {
  return Specialty.findByPk(id);
};

exports.create = async (data) => {
  return Specialty.create(data);
};

exports.update = async (specialty, data) => {
  return specialty.update(data);
};

exports.destroy = async (specialty) => {
  return specialty.destroy();
};
