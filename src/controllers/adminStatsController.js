const { Doctor, Patient, Appointment } = require("../models");

exports.getStats = async (req, res) => {
  try {
    const [totalDoctors, totalPatients, totalAppointments, pendingDoctors] =
      await Promise.all([
        Doctor.count(),
        Patient.count(),
        Appointment.count(),
        Doctor.count({ where: { is_approved: false } }),
      ]);

    res.json({
      totalDoctors,
      totalPatients,
      totalAppointments,
      pendingDoctors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching stats" });
  }
};
