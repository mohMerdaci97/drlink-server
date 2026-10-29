const homeService = require("../../services/patient/patientHome.service");
const { getLang } = require("../../helpers/patientHomeContext");

exports.getHomeData = async (req, res, next) => {
  try {
    const data = await homeService.getHomeData(req.user.id, getLang(req));

    return res.json(data);
  } catch (error) {
    next(error);
  }
};
