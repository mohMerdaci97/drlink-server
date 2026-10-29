const patientDoctorService = require("../../services/patient/patientDoctor.service");
const { getLang } = require("../../helpers/dateTime");
const { getPagination } = require("../../helpers/pagination");

exports.getDoctors = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const {
      specialty_id,
      wilaya_id,
      commune_id,
      search,
      available_today,
      sort,
    } = req.query;

    const result = await patientDoctorService.getDoctors({
      specialtyId: specialty_id,
      wilayaId: wilaya_id,
      communeId: commune_id,
      search,
      availableToday: available_today,
      sort,
      page,
      limit,
      offset,
      lang: getLang(req),
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDoctorDetail = async (req, res, next) => {
  try {
    const result = await patientDoctorService.getDoctorDetail(
      req.user?.id,
      req.params.id,
      getLang(req),
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { clinic_id, date } = req.query;

    const result = await patientDoctorService.getAvailableSlots({
      doctorId: req.params.id,
      clinicId: clinic_id,
      date,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableDays = async (req, res, next) => {
  try {
    const result = await patientDoctorService.getAvailableDays({
      doctorId: req.params.id,
      clinicId: req.query.clinic_id,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getNearbyDoctors = async (req, res, next) => {
  try {
    const { lat, lng, radius, specialty_id } = req.query;

    const result = await patientDoctorService.getNearbyDoctors({
      latitude: lat,
      longitude: lng,
      radius,
      specialtyId: specialty_id,
      lang: getLang(req),
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getSuggestions = async (req, res, next) => {
  try {
    const result = await patientDoctorService.getSuggestions(req.query.q);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getSpecialties = async (req, res, next) => {
  try {
    const result = await patientDoctorService.getSpecialties();

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getWilayas = async (req, res, next) => {
  try {
    const result = await patientDoctorService.getWilayas(getLang(req));

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getCommunes = async (req, res, next) => {
  try {
    const result = await patientDoctorService.getCommunes(
      req.params.id,
      getLang(req),
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
