const patientProfileService = require("../../services/patient/patientProfile.service");

exports.getProfile = async (req, res, next) => {
  try {
    const result = await patientProfileService.getProfile(req.user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const result = await patientProfileService.updateProfile(
      req.user.id,
      req.body,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const result = await patientProfileService.changePassword(
      req.user.id,
      req.body,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const result = await patientProfileService.deleteAccount(
      req.user.id,
      req.body.current_password,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
