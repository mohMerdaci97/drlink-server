const repository = require("../../repositories/doctor/doctorStats.repository");

exports.getStats = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Médecin introuvable.");
    error.status = 404;
    throw error;
  }

  const stats = await repository.getDoctorStats(doctor.id);

  return {
    totalAppointments: Number(stats.totalAppointments) || 0,
    completedAppointments: Number(stats.completedAppointments) || 0,
    cancelledAppointments: Number(stats.cancelledAppointments) || 0,
    totalPatients: Number(stats.totalPatients) || 0,
    totalClinics: Number(stats.totalClinics) || 0,
    completionRate: Number(stats.completionRate) || 0,
  };
};
