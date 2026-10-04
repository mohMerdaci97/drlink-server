const adminStatsRepository = require("../../repositories/admin/adminStats.repository");

exports.getStats = async () => {
  return adminStatsRepository.getStats();
};
