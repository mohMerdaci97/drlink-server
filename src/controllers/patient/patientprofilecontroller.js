const { User, Patient } = require("../../models");

// GET /patient/profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "phone", "is_active"],
        },
      ],
    });

    if (!patient) return res.status(404).json({ message: "Patient not found" });

    return res.json({
      id: patient.id,
      user_id: patient.user_id,
      full_name: patient.user?.full_name ?? "",
      email: patient.user?.email ?? "",
      phone: patient.user?.phone ?? "",
      is_active: patient.user?.is_active ?? false,
      date_of_birth: patient.date_of_birth ?? null,
      gender: patient.gender ?? null,
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /patient/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, email, date_of_birth, gender } = req.body;

    const patient = await Patient.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: "user" }],
    });

    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (full_name || email) {
      await patient.user.update({
        ...(full_name && { full_name }),
        ...(email && { email }),
      });
    }

    await patient.update({
      ...(date_of_birth !== undefined && { date_of_birth }),
      ...(gender !== undefined && { gender }),
    });

    return res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /patient/profile/password
exports.changePassword = async (req, res) => {
  try {
    const bcrypt = require("bcrypt");
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Both fields required" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash: hashed });

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
