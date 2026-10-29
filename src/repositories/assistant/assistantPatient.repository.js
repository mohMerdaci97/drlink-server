const { Op } = require("sequelize");
const { User, Assistant, Patient, DoctorPatient } = require("../../models");

const assistantPatientRepository = {
  findAssistantByUserId(userId) {
    return Assistant.findOne({
      where: { user_id: userId },
      attributes: ["id", "user_id", "doctor_id"],
    });
  },

  findUserByPhone(phone, transaction) {
    return User.findOne({
      where: { phone },
      transaction,
    });
  },

  findPatientById(patientId, transaction) {
    return Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "phone", "email"],
          required: false,
        },
      ],
      transaction,
    });
  },

  findDoctorPatient(doctorId, patientId, transaction) {
    return DoctorPatient.findOne({
      where: {
        doctor_id: doctorId,
        patient_id: patientId,
      },
      transaction,
    });
  },

  findPatients({ doctorId, search, limit, offset }) {
    const userWhere = {};

    if (search) {
      userWhere[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return Patient.findAndCountAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "phone", "email"],
          required: true,
          where: userWhere,
        },
        {
          model: DoctorPatient,
          as: "doctorPatients",
          attributes: [],
          required: true,
          where: { doctor_id: doctorId },
        },
      ],
      distinct: true,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });
  },

  async createPatientRecords({
    userData,
    patientData,
    doctorId,
    addedBy,
    transaction,
  }) {
    const user = await User.create(userData, { transaction });

    const patient = await Patient.create(
      {
        ...patientData,
        user_id: user.id,
      },
      { transaction },
    );

    await DoctorPatient.create(
      {
        doctor_id: doctorId,
        patient_id: patient.id,
        source: "walk_in",
        added_by_user_id: addedBy,
      },
      { transaction },
    );

    return { user, patient };
  },

  updateUser(user, data, transaction) {
    return user.update(data, { transaction });
  },

  updatePatient(patient, data, transaction) {
    return patient.update(data, { transaction });
  },

  removeDoctorPatientLink(link, transaction) {
    return link.destroy({ transaction });
  },
};

module.exports = assistantPatientRepository;
