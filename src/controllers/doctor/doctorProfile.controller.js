const service = require("../../services/doctor/doctorProfile.service");


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


exports.updatePhoto = async (req, res, next) => {
  try {
    const result = await service.updatePhoto(req.user.id, req.file);

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

/**
 * PATCH /doctor/profile/slot-duration
 */
exports.updateSlotDuration = async (req, res, next) => {
  try {
    const result = await service.updateSlotDuration(req.user.id, req.body);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
