const adminDoctorService = require("../../services/admin/adminDoctor.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await adminDoctorService.getAll({
      page,
      limit,
      offset,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const doctor = await adminDoctorService.getOne(req.params.id);

    return res.json(doctor);
  } catch (error) {
    next(error);
  }
};

exports.createDoctor = async (req, res, next) => {
  try {
    const doctor = await adminDoctorService.createDoctor(req.body);

    return res.status(201).json({
      message:
        "Compte médecin créé. Le médecin peut maintenant se connecter et compléter son profil.",
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

exports.approve = async (req, res, next) => {
  try {
    await adminDoctorService.approve(req.params.id);

    return res.json({
      message: "Médecin approuvé avec succès.",
    });
  } catch (error) {
    next(error);
  }
};

exports.reject = async (req, res, next) => {
  try {
    await adminDoctorService.reject(req.params.id);

    return res.json({
      message: "Médecin rejeté.",
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const result = await adminDoctorService.toggleActive(req.params.id);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
