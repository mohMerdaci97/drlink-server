const { Doctor, Specialty, User } = require("../../models");

exports.findDoctorByUserId = async (userId) => {
  return Doctor.findOne({
    where: {
      user_id: userId,
    },
  });
};

exports.findSpecialtyById = async (specialtyId) => {
  return Specialty.findByPk(specialtyId);
};

exports.updateDoctorProfile = async (
  doctor,
  { description, specialty_id },
) => {
  doctor.description = description;
  doctor.specialty_id = specialty_id;

  return doctor.save();
};

exports.updateDoctorPhoto = async (doctor, photoPath) => {
  doctor.photo = photoPath;

  return doctor.save();
};

exports.findAllSpecialties = async () => {
  return Specialty.findAll({
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
  });
};

exports.findUserById = async (userId) => {
  return User.findByPk(userId);
};