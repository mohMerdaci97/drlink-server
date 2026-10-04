const {
  Doctor,
  Appointment,
  Clinic,
} = require("../../models");

const { Op } = require("sequelize");

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
    attributes: ["id"],
  });
};

exports.getDoctorStats = async (doctorId) => {
  const [
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    totalPatients,
    totalClinics,
  ] = await Promise.all([
    // Total appointments
    Appointment.count({
      where: {
        doctor_id: doctorId,
      },
    }),

    // Completed appointments
    Appointment.count({
      where: {
        doctor_id: doctorId,
        status: "completed",
      },
    }),

    // Cancelled appointments
    Appointment.count({
      where: {
        doctor_id: doctorId,
        status: "cancelled",
      },
    }),

    // Unique patients
    Appointment.count({
      where: {
        doctor_id: doctorId,
      },
      distinct: true,
      col: "patient_id",
    }),

    // Doctor's clinics
    Clinic.count({
      where: {
        created_by_doctor_id: doctorId,
      },
    }),
  ]);

  const completionRate =
    totalAppointments > 0
      ? Math.round((completedAppointments / totalAppointments) * 100)
      : 0;

  return {
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    totalPatients,
    totalClinics,
    completionRate,
  };
};