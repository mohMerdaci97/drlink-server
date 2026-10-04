const adminPatientService = require("../../services/admin/adminPatient.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await adminPatientService.getAll({
      pagination: {
        page,
        limit,
        offset,
      },
      filters: {
        search: req.query.search,
      },
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await adminPatientService.getOne(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const result = await adminPatientService.toggleActive(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
