const appointmentRepository = require("../../repositories/admin/appointment.repository");
const { getPagingData } = require("../../helpers/pagination");

exports.getAll = async ({ filters, pagination }) => {
  const result = await appointmentRepository.findAdminAppointments({
    filters,
    pagination,
  });

  const stats = await appointmentRepository.getAdminAppointmentStats(filters);

  return {
    ...getPagingData(result, pagination.page, pagination.limit),
    stats,
  };
};
