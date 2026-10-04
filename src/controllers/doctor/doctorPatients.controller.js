const service = require("../../services/doctor/doctorPatients.service");

exports.getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user.id, req.query.search);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await service.getOne(req.user.id, req.params.patientId);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
