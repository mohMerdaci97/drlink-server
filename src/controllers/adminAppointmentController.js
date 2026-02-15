const { Appointment, Doctor, Patient, Clinic } = require("../models");

exports.getAll = async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.doctor) where.doctor_id = req.query.doctor;

  const appointments = await Appointment.findAll({
    where,
    include: [Doctor, Patient, Clinic],
  });

  res.json(appointments);
};
