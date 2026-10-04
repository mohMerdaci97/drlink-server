const service = require("../services/auth.service");

exports.login = async (req, res, next) => {
  try {
    const result = await service.login({
      phone: req.body.phone,
      password: req.body.password,
      req,
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "Strict" : "Lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const result = await service.refresh({
      token: req.cookies.refresh_token,
      req,
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const result = await service.logout({
      req,
    });

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await service.me(req.user.id);

    return res.json(user);
  } catch (error) {
    next(error);
  }
};
