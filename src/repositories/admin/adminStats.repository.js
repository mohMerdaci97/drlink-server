const { Doctor, Patient, Appointment } = require("../../models");

exports.getStats = async () => {
  const [totalDoctors, totalPatients, totalAppointments, pendingDoctors] =
    await Promise.all([
      Doctor.count(),

      Patient.count(),

      Appointment.count(),

      Doctor.count({
        where: {
          is_approved: false,
        },
      }),
    ]);

  return {
    totalDoctors,
    totalPatients,
    totalAppointments,
    pendingDoctors,
  };
};
