const adminAppointmentService = require("../../services/admin/adminAppointment.service");
const { getPagination } = require("../../helpers/pagination");

exports.getAll = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const result = await adminAppointmentService.getAll({
      filters: {
        doctor_id: req.query.doctor_id,
        date: req.query.date,
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        search: req.query.search,
      },
      pagination: {
        page,
        limit,
        offset,
      },
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
