const { Assistant, DoctorPatient, Appointment } = require("../../models");

exports.findAssistantByUserId = (userId) =>
  Assistant.findOne({
    where: { user_id: userId },
    attributes: ["id", "user_id", "doctor_id"],
  });

exports.getDashboardSummary = async ({ doctorId, today }) => {
  const [totalPatients, todayAppointments, pendingAppointments] =
    await Promise.all([
      DoctorPatient.count({
        where: { doctor_id: doctorId },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
          appointment_date: today,
        },
      }),

      Appointment.count({
        where: {
          doctor_id: doctorId,
          status: "pending",
        },
      }),
    ]);

  return {
    totalPatients,
    todayAppointments,
    pendingAppointments,
  };
};
