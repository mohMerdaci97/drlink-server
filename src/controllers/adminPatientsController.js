const { User, Patient } = require("../models");
const { getPagination, getPagingData } = require("../helpers/pagination");

exports.getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await User.findAndCountAll({
      where: { role: "patient" },
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
          as: "patient",
          attributes: ["date_of_birth", "gender"],
        },
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const response = getPagingData(result, page, limit);
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const patient = await User.findOne({
      where: { id: req.params.id, role: "patient" },
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["date_of_birth", "gender"],
        },
      ],
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user || user.role !== "patient") {
      return res.status(404).json({ message: "Patient not found" });
    }

    user.is_active = !user.is_active;
    await user.save();

    res.json({
      message: user.is_active ? "Patient unblocked" : "Patient blocked",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
