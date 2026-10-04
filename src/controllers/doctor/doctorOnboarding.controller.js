const doctorProfileService = require("../../services/doctor/doctorOnboarding.service");

exports.createProfile = async (req, res, next) => {
  try {
    const result = await doctorProfileService.createProfile(
      req.user.id,
      req.body,
      req.file,
    );

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDoctorSpecialities = async (req, res, next) => {
  try {
    const specialties = await doctorProfileService.getSpecialties();

    return res.json(specialties);
  } catch (error) {
    next(error);
  }
};
