const { Specialty } = require("../models");

exports.getForDoctors = async (_, res) => {
  try {
    const specialties = await Specialty.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    res.json(specialties);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur." });
  }
};
