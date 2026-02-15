const { Specialty } = require("../models");

exports.getAll = async (_, res) => {
  res.json(await Specialty.findAll());
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
