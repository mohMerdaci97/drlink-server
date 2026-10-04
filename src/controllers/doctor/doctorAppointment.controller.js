const service = require("../../services/doctor/doctorAppointment.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await service.getAll({
      userId: req.user.id,
      page,
      limit,
      offset,
      status: req.query.status,
      date: req.query.date,
      search: req.query.search,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getToday = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const result = await service.getToday(req.user.id, today);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.confirm = async (req, res, next) => {
  try {
    const result = await service.confirm(req.user.id, req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const result = await service.cancel(req.user.id, req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const result = await service.complete(req.user.id, req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
