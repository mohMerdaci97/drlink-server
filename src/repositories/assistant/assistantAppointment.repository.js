const {
  Assistant,
  Doctor,
  Appointment,
  Patient,
  User,
  DoctorPatient,
  DoctorClinic,
  Clinic,
} = require("../../models");

const assistantAppointmentRepository = {
  findAssistantByUserId(userId) {
    return Assistant.findOne({
      where: { user_id: userId },
      attributes: ["id", "user_id", "doctor_id"],
    });
  },

  findAppointmentsByDate({ doctorId, date }) {
    return Appointment.findAll({
      where: {
        doctor_id: doctorId,
        appointment_date: date,
      },
      include: [
        {
          model: Patient,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone"],
            },
          ],
        },
      ],
      order: [["appointment_time", "ASC"]],
    });
  },

  findAppointmentByIdForDoctor({ appointmentId, doctorId }) {
    return Appointment.findOne({
      where: {
        id: appointmentId,
        doctor_id: doctorId,
      },
    });
  },

  updateAppointmentStatus(appointment, status) {
    return appointment.update({ status });
  },

  findDoctorClinicSchedule({ doctorId, clinicId, dayOfWeek }) {
    return DoctorClinic.findOne({
      where: {
        doctor_id: doctorId,
        clinic_id: Number(clinicId),
        day_of_week: dayOfWeek,
      },
      logging: console.log,
    });
  },
  findAppointmentsForDate({ doctorId, clinicId, date, statuses, transaction }) {
    return Appointment.findAll({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        appointment_date: date,
        status: statuses,
      },
      attributes: ["id", "appointment_date", "appointment_time", "status"],
      transaction,
    });
  },

  findPatientById(patientId, transaction) {
    return Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "phone"],
        },
      ],
      transaction,
    });
  },

  findDoctorPatientLink({ doctorId, patientId, transaction }) {
    return DoctorPatient.findOne({
      where: {
        doctor_id: doctorId,
        patient_id: patientId,
      },
      transaction,
    });
  },

  createDoctorPatientLink({ doctorId, patientId, transaction }) {
    return DoctorPatient.create(
      {
        doctor_id: doctorId,
        patient_id: patientId,
        source: "app",
        added_by_user_id: null,
      },
      { transaction },
    );
  },

  createAppointment(data, transaction) {
    return Appointment.create(data, { transaction });
  },

  async findClinicsByDoctorId(doctorId) {
    const doctor = await Doctor.findByPk(doctorId, {
      attributes: ["id"],
      include: [
        {
          model: Clinic,
          as: "Clinics",
          attributes: ["id", "name", "address"],
          through: { attributes: [] },
        },
      ],
    });

    return doctor?.Clinics || [];
  },
};

module.exports = assistantAppointmentRepository;
