const repository = require("../../repositories/doctor/doctorAssistant.repository");

const getDoctor = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");
    error.status = 404;
    throw error;
  }

  return doctor;
};

exports.getOne = async (userId, assistantId) => {
  const doctor = await getDoctor(userId);

  const assistant = await repository.findAssistantByIdForDoctor(
    assistantId,
    doctor.id,
  );

  if (!assistant) {
    const error = new Error("Assistant introuvable.");
    error.status = 404;
    throw error;
  }

  return assistant;
};

exports.getAll = async (userId) => {
  const doctor = await getDoctor(userId);

  return repository.findAllByDoctorId(doctor.id);
};

exports.create = async (userId, data) => {
  const doctor = await getDoctor(userId);

  const assistant = await repository.create({
    ...data,
    doctor_id: doctor.id,
  });

  return {
    message: "Assistant créé avec succès.",
    assistant,
  };
};

exports.update = async (userId, assistantId, data) => {
  const doctor = await getDoctor(userId);

  const assistant = await repository.findAssistantByIdForDoctor(
    assistantId,
    doctor.id,
  );

  if (!assistant) {
    const error = new Error("Assistant introuvable.");
    error.status = 404;
    throw error;
  }

  await repository.update(assistant, data);

  return assistant;
};

exports.remove = async (userId, assistantId) => {
  const doctor = await getDoctor(userId);

  const assistant = await repository.findAssistantByIdForDoctor(
    assistantId,
    doctor.id,
  );

  if (!assistant) {
    const error = new Error("Assistant introuvable.");
    error.status = 404;
    throw error;
  }

  await repository.delete(assistant);
};
