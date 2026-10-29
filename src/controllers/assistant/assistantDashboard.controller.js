const service = require("../../services/assistant/assistantDashboard.service");

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const result = await service.getDashboardSummary(req.user.id);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};
