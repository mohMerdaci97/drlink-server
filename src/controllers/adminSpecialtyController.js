const { Specialty } = require("../models");
const { getPagination, getPagingData } = require("../helpers/pagination");
exports.getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await Specialty.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
    });

    const response = getPagingData(result, page, limit);

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.create = async (req, res) => {
  const specialty = await Specialty.create(req.body);
  res.json(specialty);
};

exports.update = async (req, res) => {
  await Specialty.update(req.body, {
    where: { id: req.params.id },
  });
  res.json({ message: "Updated" });
};

exports.remove = async (req, res) => {
  await Specialty.destroy({
    where: { id: req.params.id },
  });
  res.json({ message: "Deleted" });
};
