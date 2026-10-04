const adminStatsService = require("../../services/admin/adminStats.service");

exports.getStats = async (req, res, next) => {
  try {
    const result = await adminStatsService.getStats();

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
