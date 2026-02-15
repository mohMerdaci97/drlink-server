const { Wilaya, Commune } = require("../models");

exports.getWilayas = async (req, res) => {
  try {
    const wilayas = await Wilaya.findAll({
      order: [["id", "ASC"]],
    });
    res.json(wilayas);
  } catch (err) {
    res.status(500).json({ message: "Failed to load wilayas" });
  }
};

exports.getCommunesByWilaya = async (req, res) => {
  try {
    const { wilayaId } = req.params;

    const communes = await Commune.findAll({
      where: { wilaya_id: wilayaId },
      order: [["name_fr", "ASC"]],
    });

    res.json(communes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load communes" });
  }
};
