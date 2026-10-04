const service = require("../../services/doctor/doctorSubscription.service");

exports.getSubscription = async (req, res, next) => {
  try {
    const result = await service.getSubscription(req.user.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
