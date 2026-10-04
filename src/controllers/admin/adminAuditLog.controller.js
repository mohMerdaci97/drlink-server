const service = require("../../services/admin/adminAuditLog.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await service.getAll({
      page,
      limit,
      offset,
      action: req.query.action,
      role: req.query.role,
      status: req.query.status,
      userId: req.query.userId,
      entityType: req.query.entityType,
      from: req.query.from,
      to: req.query.to,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await service.getOne(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
