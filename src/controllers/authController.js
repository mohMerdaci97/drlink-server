const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokens");

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Téléphone et mot de passe requis." });
    }

    const normalizedPhone = phone.trim();

    const user = await User.findOne({ where: { phone: normalizedPhone } });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Téléphone ou mot de passe incorrect." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Téléphone ou mot de passe incorrect." });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: "Compte désactivé. Contactez l'administrateur.",
      });
    }

    if (!["admin", "doctor"].includes(user.role)) {
      return res.status(403).json({ message: "Rôle non autorisé." });
    }

    // Generate tokens from utils
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //  Cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token: accessToken, 
      role: user.role,
      user: {
        id: user.id,
        full_name: user.full_name,
        onboarding_status: user.onboarding_status,
        is_super: user.is_super,
      },
    });
  } catch (err) {
    console.error("Login error:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
    });

    return res.status(500).json({ message: "Erreur serveur." });
  }
};

//refresh
exports.refresh = (req, res) => {
  const token = req.cookies.refresh_token;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const accessToken = generateAccessToken({
      id: decoded.id,
      role: decoded.role,
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.sendStatus(200);
  } catch {
    return res.sendStatus(401);
  }
};

//  LOGOUT
exports.logout = (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.sendStatus(200);
};

// current user

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "full_name", "role", "onboarding_status", "is_super"],
    });

    if (!user) return res.sendStatus(404);

    res.json(user);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
