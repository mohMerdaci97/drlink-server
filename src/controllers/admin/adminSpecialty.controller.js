const adminSpecialtyService = require("../../services/admin/adminSpecialty.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await adminSpecialtyService.getAll({
      pagination: {
        page,
        limit,
        offset,
      },
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const result = await adminSpecialtyService.create({
      name: req.body.name,
      file: req.file,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const result = await adminSpecialtyService.update(req.params.id, {
      name: req.body.name,
      file: req.file,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await adminSpecialtyService.remove(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
