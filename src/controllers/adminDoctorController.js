const { Doctor, User, Specialty } = require("../models");
const { getPagination, getPagingData } = require("../helpers/pagination");

exports.getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await Doctor.findAndCountAll({
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        { model: User, attributes: ["email", "full_name", "is_active"] },
        { model: Specialty },
      ],
    });

    const response = getPagingData(result, page, limit);
    res.json(response);
  } catch (error) {
    console.error("Get doctors error:", error.message);
    console.error("Stack trace:", error.stack);
    if (error.original) console.error("Sequelize error:", error.original);
    res
      .status(500)
      .json({ message: "Failed to fetch doctors", error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [User, Specialty],
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(doctor);
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ message: "Failed to fetch doctor" });
  }
};

exports.approve = async (req, res) => {
  try {
    const [updated] = await Doctor.update(
      { is_approved: true },
      { where: { id: req.params.id } },
    );

    if (!updated) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json({ message: "Doctor approved" });
  } catch (error) {
    console.error("Approve doctor error:", error);
    res.status(500).json({ message: "Failed to approve doctor" });
  }
};

exports.reject = async (req, res) => {
  try {
    const [updated] = await Doctor.update(
      { is_approved: false },
      { where: { id: req.params.id } },
    );

    if (!updated) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json({ message: "Doctor rejected" });
  } catch (error) {
    console.error("Reject doctor error:", error);
    res.status(500).json({ message: "Failed to reject doctor" });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, { include: User });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.User.is_active = !doctor.User.is_active;
    await doctor.User.save();

    res.json({ is_active: doctor.User.is_active });
  } catch (error) {
    console.error("Toggle doctor error:", error);
    res.status(500).json({ message: "Failed to toggle doctor status" });
  }
};
