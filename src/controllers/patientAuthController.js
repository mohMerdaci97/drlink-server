const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Patient } = require("../models");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokens");

exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(400).json({ message: "Email already used" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name,
      email,
      password_hash: hashedPassword,
      role: "patient",
      is_active: true,
    });

    // create patient profile
    await Patient.create({
      user_id: user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN PATIENT
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user || user.role !== "patient") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// REFRESH TOKEN
exports.refresh = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const accessToken = generateAccessToken({
      id: decoded.id,
      role: decoded.role,
    });

    return res.json({ accessToken });
  } catch (err) {
    return res.sendStatus(401);
  }
};

// GET CURRENT USER
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "full_name", "email", "role"],
    });

    if (!user) return res.sendStatus(404);

    res.json(user);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGOUT (client handles token deletion)
exports.logout = async (req, res) => {
  return res.json({ message: "Logged out successfully" });
};
