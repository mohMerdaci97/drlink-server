const {
  Doctor,
  DoctorSubscription,
  Plan,
} = require("../../models");

const { Op } = require("sequelize");

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
  });
};

exports.findLatestSubscription = async (doctorId) => {
  return DoctorSubscription.findOne({
    where: {
      doctor_id: doctorId,
      status: {
        [Op.in]: ["active", "grace", "expired"],
      },
    },
    order: [["created_at", "DESC"]],
    include: [
      {
        model: Plan,
        as: "Plan",
      },
    ],
  });
};