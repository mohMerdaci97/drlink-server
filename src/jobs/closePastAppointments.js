const { Op } = require("sequelize");
const { Appointment } = require("../models");
const { STATUS, CLOSE_JOB_INTERVAL_MS } = require("../constants/appointment");
const { getNowInAlgiers } = require("../helpers/dateTime");

const startedBefore = ({ date, time }) => ({
  [Op.or]: [
    { appointment_date: { [Op.lt]: date } },
    { appointment_date: date, appointment_time: { [Op.lte]: time } },
  ],
});

const closePast = async () => {
  try {
    const where = startedBefore(getNowInAlgiers());

    await Appointment.update(
      { status: STATUS.COMPLETED },
      { where: { status: STATUS.CONFIRMED, ...where } },
    );
    await Appointment.update(
      { status: STATUS.CANCELLED },
      { where: { status: STATUS.PENDING, ...where } },
    );
  } catch (error) {
    console.error("closePastAppointments failed:", error.message);
  }
};

exports.startAppointmentJobs = () => {
  closePast();
  setInterval(closePast, CLOSE_JOB_INTERVAL_MS).unref();
};
