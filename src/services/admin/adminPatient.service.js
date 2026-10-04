const patientRepository = require("../../repositories/admin/patient.repository");
const { getPagingData } = require("../../helpers/pagination");

exports.getAll = async ({ pagination, filters }) => {
  const result = await patientRepository.findAll({
    pagination,
    filters,
  });

  return getPagingData(result, pagination.page, pagination.limit);
};

exports.getOne = async (id) => {
  const patient = await patientRepository.findById(id);

  if (!patient) {
    const error = new Error("Patient introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return patient;
};

exports.toggleActive = async (id) => {
  const patient = await patientRepository.findUserPatientById(id);

  if (!patient) {
    const error = new Error("Patient introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const updated = await patientRepository.toggleActive(patient);

  return {
    message: updated.is_active
      ? "Patient débloqué avec succès."
      : "Patient bloqué avec succès.",
  };
};
