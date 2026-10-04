const adminClinicService = require("../../services/admin/adminClinic.service");

exports.getAll = async (req, res, next) => {
  try {
    const result = await adminClinicService.getAll({
      search: req.query.search,
      wilaya_id: req.query.wilaya_id,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await adminClinicService.getOne(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const clinic = await adminClinicService.create(req.body);

    return res.status(201).json({
      message: "Clinique créée.",
      clinic,
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const clinic = await adminClinicService.update(req.params.id, req.body);

    return res.json({
      message: "Clinique mise à jour.",
      clinic,
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await adminClinicService.remove(req.params.id);

    return res.json({
      message: "Clinique supprimée.",
    });
  } catch (error) {
    next(error);
  }
};
