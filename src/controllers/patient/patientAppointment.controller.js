const patientAppointmentService = require("../../services/patient/patientAppointment.service");
const { getPagination } = require("../../helpers/pagination");

exports.getMyAppointments = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await patientAppointmentService.getMyAppointments(
      req.user.id,
      {
        status: req.query.status,
        scope: req.query.scope,
        page,
        limit,
        offset,
      },
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await patientAppointmentService.getOne(
      req.user.id,
      req.params.id,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { doctor_id, clinic_id, date } = req.query;

    const result = await patientAppointmentService.getAvailableSlots({
      doctorId: doctor_id,
      clinicId: clinic_id,
      date,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableDays = async (req, res, next) => {
  try {
    const { doctor_id, clinic_id } = req.query;

    const result = await patientAppointmentService.getAvailableDays({
      doctorId: doctor_id,
      clinicId: clinic_id,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const result = await patientAppointmentService.create(
      req.user.id,
      req.body,
    );

    // 200 when the same booking already existed (retry), 201 when new
    return res.status(result.already_booked ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.reschedule = async (req, res, next) => {
  try {
    const result = await patientAppointmentService.reschedule(
      req.user.id,
      req.params.id,
      req.body,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const result = await patientAppointmentService.cancel(
      req.user.id,
      req.params.id,
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
