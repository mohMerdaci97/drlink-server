const { Assistant, Doctor, User } = require("../../models");

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
  });
};

exports.findAssistantByIdForDoctor = async (assistantId, doctorId) => {
  return Assistant.findOne({
    where: {
      id: assistantId,
      doctor_id: doctorId,
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "phone", "email"],
      },
    ],
  });
};

exports.findAllByDoctorId = async (doctorId) => {
  return Assistant.findAll({
    where: {
      doctor_id: doctorId,
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "phone", "email"],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

exports.create = async (data) => {
  return Assistant.create(data);
};

exports.update = async (assistant, data) => {
  return assistant.update(data);
};

exports.delete = async (assistant) => {
  return assistant.destroy();
};
