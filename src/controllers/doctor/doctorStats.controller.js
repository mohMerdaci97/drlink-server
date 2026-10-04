const service = require("../../services/doctor/doctorStats.service");

exports.getStats = async (req, res, next) => {
  try {
    const result = await service.getStats(req.user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
