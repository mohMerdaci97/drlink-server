const service = require("../../services/admin/adminManagement.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await service.getAll({
      search: req.query.search,
      page,
      limit,
      offset,
    });

    return res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const result = await service.create({
      ...req.body,
      req,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const result = await service.update(req.params.id, req.body, req.user, req);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.toggle = async (req, res, next) => {
  try {
    const result = await service.toggle(req.params.id, req.user, req);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await service.resetPassword(
      req.params.id,
      req.body,
      req.user,
      req,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id, req.user, req);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
