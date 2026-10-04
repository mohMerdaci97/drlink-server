const repository = require("../../repositories/doctor/doctorSubscription.repository");

exports.getSubscription = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    return null;
  }

  return repository.findLatestSubscription(doctor.id);
};
