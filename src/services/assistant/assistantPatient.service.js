const { sequelize, User, Patient } = require("../../models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const repository = require("../../repositories/assistant/assistantPatient.repository");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getAssistantDoctor = async (userId) => {
  const assistant = await repository.findAssistantByUserId(userId);

  if (!assistant) {
    throw createError("Assistant introuvable.", 404);
  }

  if (!assistant.doctor_id) {
    throw createError("Aucun médecin n'est associé à cet assistant.", 403);
  }

  return {
    assistant,
    doctorId: assistant.doctor_id,
  };
};

const normalizeSearch = (value) =>
  typeof value === "string" ? value.trim() : "";

const assistantPatientService = {
  async createPatient(userId, data) {
    const { assistant, doctorId } = await getAssistantDoctor(userId);

    const { first_name, last_name, phone, email, ...patientData } = data;

    if (!first_name || !last_name || !phone) {
      throw createError(
        "Le nom, le prénom et le numéro de téléphone sont obligatoires.",
        400,
      );
    }

    const existingUser = await repository.findUserByPhone(phone);

    if (existingUser) {
      throw createError(
        "Un utilisateur avec ce numéro de téléphone existe déjà.",
        409,
      );
    }

    if (email) {
      const existingEmail = await User.findOne({ where: { email } });

      if (existingEmail) {
        throw createError("Cette adresse e-mail est déjà utilisée.", 409);
      }
    }

    const temporaryPassword = crypto.randomBytes(12).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    return sequelize.transaction(async (transaction) => {
      const { patient } = await repository.createPatientRecords({
        userData: {
          first_name,
          last_name,
          phone,
          email: email || null,
          password: hashedPassword,
          role: "patient",
        },
        patientData,
        doctorId,
        addedBy: assistant.id,
        transaction,
      });

      return {
        patient: await repository.findPatientById(patient.id, transaction),
      };
    });
  },

  async searchPatients(userId, query) {
    const { doctorId } = await getAssistantDoctor(userId);
    const search = normalizeSearch(query);

    if (!search) {
      return [];
    }

    const { rows } = await repository.findPatients({
      doctorId,
      search,
      limit: 10,
      offset: 0,
    });

    return rows;
  },

  async getPatients(userId, query = {}) {
    const { doctorId } = await getAssistantDoctor(userId);

    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(query.limit, 10) || 10),
    );

    const search = normalizeSearch(query.search);

    const { count, rows } = await repository.findPatients({
      doctorId,
      search,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    };
  },

  async getPatient(userId, patientId) {
    const { doctorId } = await getAssistantDoctor(userId);

    const link = await repository.findDoctorPatient(doctorId, patientId);

    if (!link) {
      throw createError("Patient introuvable.", 404);
    }

    const patient = await repository.findPatientById(patientId);

    if (!patient) {
      throw createError("Patient introuvable.", 404);
    }

    return patient;
  },

  async updatePatient(userId, patientId, data) {
    const { doctorId } = await getAssistantDoctor(userId);

    const link = await repository.findDoctorPatient(doctorId, patientId);

    if (!link) {
      throw createError("Patient introuvable.", 404);
    }

    const patient = await repository.findPatientById(patientId);

    if (!patient || !patient.user) {
      throw createError("Patient introuvable.", 404);
    }

    const { first_name, last_name, phone, email, ...patientData } = data;

    if (phone && phone !== patient.user.phone) {
      const existingUser = await repository.findUserByPhone(phone);

      if (existingUser) {
        throw createError(
          "Un utilisateur avec ce numéro de téléphone existe déjà.",
          409,
        );
      }
    }

    if (email && email !== patient.user.email) {
      const existingEmail = await User.findOne({
        where: { email },
      });

      if (existingEmail) {
        throw createError("Cette adresse e-mail est déjà utilisée.", 409);
      }
    }

    return sequelize.transaction(async (transaction) => {
      const userUpdates = {};

      if (first_name !== undefined) userUpdates.first_name = first_name;
      if (last_name !== undefined) userUpdates.last_name = last_name;
      if (phone !== undefined) userUpdates.phone = phone;
      if (email !== undefined) userUpdates.email = email;

      if (Object.keys(userUpdates).length) {
        await repository.updateUser(patient.user, userUpdates, transaction);
      }

      if (Object.keys(patientData).length) {
        await repository.updatePatient(patient, patientData, transaction);
      }

      return repository.findPatientById(patientId, transaction);
    });
  },

  async removePatientFromMyList(userId, patientId) {
    const { doctorId } = await getAssistantDoctor(userId);

    const link = await repository.findDoctorPatient(doctorId, patientId);

    if (!link) {
      throw createError(
        "Ce patient ne figure pas dans la liste de votre médecin.",
        404,
      );
    }

    await repository.removeDoctorPatientLink(link);

    return {
      message: "Le patient a été retiré de la liste avec succès.",
    };
  },
};

module.exports = assistantPatientService;
