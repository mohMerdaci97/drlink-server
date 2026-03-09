const {
  Appointment,
  Doctor,
  Patient,
  User,
  Clinic,
  Specialty,
} = require("../models");
const { getPagination, getPagingData } = require("../helpers/pagination");
const { Op } = require("sequelize");

exports.getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { doctor_id, date, status, start_date, end_date, search } = req.query;

    const where = {};

    if (doctor_id) where.doctor_id = doctor_id;
    if (status) where.status = status;

    if (date) {
      where.appointment_date = date;
    } else if (start_date && end_date) {
      where.appointment_date = { [Op.between]: [start_date, end_date] };
    }

    let patientIdFilter = undefined;
    let doctorIdFilter = undefined;

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const matchingUsers = await User.findAll({
        where: { full_name: { [Op.like]: term } },
        attributes: ["id"],
      });
      const userIds = matchingUsers.map((u) => u.id);

      const matchingPatients = await Patient.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: ["id"],
      });
      patientIdFilter = matchingPatients.map((p) => p.id);

      const matchingDoctors = await Doctor.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: ["id"],
      });
      doctorIdFilter = matchingDoctors.map((d) => d.id);

      where[Op.or] = [
        { patient_id: { [Op.in]: patientIdFilter } },
        { doctor_id: { [Op.in]: doctorIdFilter } },
      ];
    }

    const result = await Appointment.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "appointment_date",
        "appointment_time",
        "status",
        "created_at",
      ],
      include: [
        {
          model: Doctor,
          attributes: ["id"],
          include: [
            {
              model: User,
              attributes: ["id", "full_name", "phone", "email"],
            },
            {
              model: Specialty,
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Patient,
          attributes: ["id", "user_id"],
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "phone", "email"],
              required: false,
            },
          ],
        },
        {
          model: Clinic,
          attributes: ["id", "name", "address", "phone"],
        },
      ],
    });

    // Stats aggregation (counts per status)
    const statsWhere = { ...where };
    delete statsWhere.status;

    const [pending, confirmed, cancelled, completed] = await Promise.all([
      Appointment.count({ where: { ...statsWhere, status: "pending" } }),
      Appointment.count({ where: { ...statsWhere, status: "confirmed" } }),
      Appointment.count({ where: { ...statsWhere, status: "cancelled" } }),
      Appointment.count({ where: { ...statsWhere, status: "completed" } }),
    ]);

    const stats = { pending, confirmed, cancelled, completed };

    const response = getPagingData(result, page, limit);
    res.json({ ...response, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
