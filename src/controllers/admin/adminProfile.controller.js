const adminProfileService = require("../../services/admin/adminProfile.service");

exports.getProfile = async (req, res, next) => {
  try {
    const result = await adminProfileService.getProfile(req.user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const result = await adminProfileService.updateProfile(
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
    const result = await adminProfileService.changePassword(
      req.user.id,
      req.body,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
