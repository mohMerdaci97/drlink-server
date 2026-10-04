const adminReportService = require("../../services/admin/adminReport.service");

exports.getReports = async (req, res, next) => {
  try {
    const result = await adminReportService.getReports();

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
