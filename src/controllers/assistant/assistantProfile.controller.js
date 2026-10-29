const service = require("../../services/assistant/assistantProfile.service");

exports.getProfile = async (req, res, next) => {
  try {
    const result = await service.getProfile(req.user.id);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const result = await service.updateProfile(req.user.id, req.body);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const result = await service.changePassword(req.user.id, req.body);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await service.resetPassword(req.user.id, req.body);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};
