const bcrypt = require("bcrypt");
const ROLES = require("../../constants/roles");
const { sequelize } = require("../../models");
const doctorRepository = require("../../repositories/admin/doctor.repository");
const userRepository = require("../../repositories/admin/user.repository");
const { getPagingData } = require("../../helpers/pagination");

exports.getAll = async ({ page, limit, offset }) => {
  const result = await doctorRepository.findAll({
    limit,
    offset,
  });

  return getPagingData(result, page, limit);
};

exports.getOne = async (doctorId) => {
  const doctor = await doctorRepository.findAdminDetails(doctorId);

  if (!doctor) {
    const error = new Error("Médecin introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: doctor.id,
    description: doctor.description,
    photo_url: doctor.photo_url,
    is_approved: doctor.is_approved,
    User: doctor.User,
    Specialty: doctor.Specialty,
    Clinics: doctor.Clinics,
    DoctorClinics: doctor.DoctorClinics,
  };
};

exports.createDoctor = async (data) => {
  const { full_name, phone, email, temp_password } = data;

  if (!full_name?.trim()) {
    const error = new Error("Nom complet requis.");
    error.statusCode = 400;
    throw error;
  }

  if (!phone?.trim()) {
    const error = new Error("Téléphone requis.");
    error.statusCode = 400;
    throw error;
  }

  if (!temp_password || temp_password.length < 8) {
    const error = new Error(
      "Mot de passe temporaire requis (min 8 caractères).",
    );
    error.statusCode = 400;
    throw error;
  }

  const phoneValue = phone.trim();
  const emailValue = email?.trim() || null;

  const phoneExists = await userRepository.findByPhone(phoneValue);

  if (phoneExists) {
    const error = new Error("Ce numéro est déjà utilisé.");
    error.statusCode = 409;
    throw error;
  }

  if (emailValue) {
    const emailExists = await userRepository.findByEmail(emailValue);

    if (emailExists) {
      const error = new Error("Cet email est déjà utilisé.");
      error.statusCode = 409;
      throw error;
    }
  }

  const password_hash = await bcrypt.hash(temp_password, 12);

  const transaction = await sequelize.transaction();

  try {
    const user = await userRepository.create(
      {
        full_name: full_name.trim(),
        phone: phoneValue,
        email: emailValue,
        password_hash,
        role: ROLES.DOCTOR,
        is_active: false,
        onboarding_status: "pending_approval",
        must_change_password: true,
      },
      { transaction },
    );

    await doctorRepository.create(
      {
        user_id: user.id,
        is_approved: false,
      },
      { transaction },
    );

    await transaction.commit();

    return {
      user_id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.approve = async (doctorId) => {
  const doctor = await doctorRepository.findByIdWithUser(doctorId);

  if (!doctor) {
    const error = new Error("Médecin introuvable.");
    error.statusCode = 404;
    throw error;
  }

  if (doctor.is_approved) {
    const error = new Error("Le médecin est déjà approuvé.");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await sequelize.transaction();

  try {
    await doctorRepository.update(
      doctor,
      {
        is_approved: true,
      },
      { transaction },
    );

    await userRepository.update(
      doctor.User,
      {
        is_active: true,
        onboarding_status: "pending_profile",
        must_change_password: true,
      },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.reject = async (doctorId) => {
  const doctor = await doctorRepository.findById(doctorId);

  if (!doctor) {
    const error = new Error("Médecin introuvable.");
    error.statusCode = 404;
    throw error;
  }

  await doctorRepository.update(doctor, {
    is_approved: false,
  });
};

exports.toggleActive = async (doctorId) => {
  const doctor = await doctorRepository.findByIdWithUser(doctorId);

  if (!doctor) {
    const error = new Error("Médecin introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const newStatus = !doctor.User.is_active;

  await userRepository.update(doctor.User, {
    is_active: newStatus,
  });

  return {
    is_active: newStatus,
  };
};
