const patientAuthService = require("../../services/patient/patientAuth.service");

exports.register = async (req, res, next) => {
  try {
    const result = await patientAuthService.register(req.body);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await patientAuthService.login(req.body);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const result = await patientAuthService.refresh(req.body.refreshToken);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const result = await patientAuthService.logout(req.body?.refreshToken);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.logoutAll = async (req, res, next) => {
  try {
    const result = await patientAuthService.logoutAll(req.user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const result = await patientAuthService.me(req.user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
