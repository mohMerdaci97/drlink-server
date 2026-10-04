const repository = require("../../repositories/doctor/doctorOnboarding.repository");

const getDoctor = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");
    error.status = 404;
    throw error;
  }

  return doctor;
};

exports.createProfile = async (userId, data, file) => {
  const doctor = await getDoctor(userId);

  const { description, specialty_id } = data;

  if (!specialty_id) {
    const error = new Error("La spécialité est obligatoire.");
    error.status = 400;
    throw error;
  }

  const specialty = await repository.findSpecialtyById(specialty_id);

  if (!specialty) {
    const error = new Error("Spécialité introuvable.");
    error.status = 404;
    throw error;
  }

  await repository.updateDoctorProfile(doctor, {
    description,
    specialty_id,
  });

  if (file) {
    await repository.updateDoctorPhoto(doctor, file.path);
  }

  return {
    message: "Profil médecin créé avec succès.",
    doctor,
  };
};

exports.getSpecialties = async () => {
  return repository.findAllSpecialties();
};
