const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sequelize } = require("../../models");
const createError = require("../../helpers/httpError");
const hashToken = require("../../helpers/hashToken");
const { getNowInAlgiers } = require("../../helpers/dateTime");
const patientProfileRepository = require("../../repositories/patient/patientProfile.repository");
const { BCRYPT_ROUNDS } = require("../../constants/auth");
const {
  PATIENT_FIELDS,
  DELETED_NAME,
} = require("../../constants/patientProfile");

// Private helpers

const getPatientOrFail = async (userId) => {
  const patient = await patientProfileRepository.findPatientWithUser(userId);

  if (!patient) throw createError(404, "Patient introuvable.");

  if (patient.user && patient.user.is_active === false) {
    throw createError(403, "Compte désactivé.");
  }

  return patient;
};

// Sensitive actions need the current password
const verifyPasswordOrFail = async (userId, password) => {
  const user = await patientProfileRepository.findUserWithPassword(userId);

  if (!user) throw createError(404, "Utilisateur introuvable.");

  if (!user.is_active) throw createError(403, "Compte désactivé.");

  const isMatch = password
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!isMatch) throw createError(401, "Mot de passe actuel incorrect.");

  return user;
};

const ageOf = (dateOfBirth, today) => {
  if (!dateOfBirth) return null;

  const [by, bm, bd] = String(dateOfBirth).slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);

  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};

// Percent of useful fields filled + what is missing
const getCompletion = (patient) => {
  const checks = {
    full_name: Boolean(patient.user?.full_name),
    email: Boolean(patient.user?.email),
    phone: Boolean(patient.user?.phone),
    date_of_birth: Boolean(patient.date_of_birth),
    gender: Boolean(patient.gender),
    wilaya_id: Boolean(patient.wilaya_id),
  };

  const keys = Object.keys(checks);

  return {
    percent: Math.round(
      (keys.filter((k) => checks[k]).length / keys.length) * 100,
    ),
    missing: keys.filter((k) => !checks[k]),
  };
};

const formatProfile = (patient, stats, now) => ({
  id: patient.id,
  user_id: patient.user_id,
  full_name: patient.user?.full_name ?? "",
  email: patient.user?.email ?? "",
  phone: patient.user?.phone ?? "",
  is_active: patient.user?.is_active ?? false,
  member_since: patient.user?.created_at ?? null,
  date_of_birth: patient.date_of_birth ?? null,
  age: ageOf(patient.date_of_birth, now.date),
  gender: patient.gender ?? null,
  wilaya_id: patient.wilaya_id ?? null,
  commune_id: patient.commune_id ?? null,
  blood_type: patient.blood_type ?? null,
  emergency_contact:
    patient.emergency_contact_name || patient.emergency_contact_phone
      ? {
          name: patient.emergency_contact_name ?? null,
          phone: patient.emergency_contact_phone ?? null,
        }
      : null,
  completion: getCompletion(patient),
  stats,
});

// ── Service ─────────────────────────────────────────

exports.getProfile = async (userId) => {
  const patient = await getPatientOrFail(userId);
  const now = getNowInAlgiers();

  const [byStatus, upcoming] = await Promise.all([
    patientProfileRepository.countAppointmentsByStatus(patient.id),
    patientProfileRepository.countUpcomingAppointments({
      patientId: patient.id,
      today: now.date,
      nowTime: now.time,
    }),
  ]);

  const counts = Object.fromEntries(
    byStatus.map((r) => [r.status, Number(r.count)]),
  );

  const stats = {
    appointments_total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    appointments_upcoming: upcoming,
    appointments_completed: counts.completed || 0,
    appointments_cancelled: counts.cancelled || 0,
  };

  return formatProfile(patient, stats, now);
};

exports.updateProfile = async (userId, data) => {
  const patient = await getPatientOrFail(userId);

  const userUpdates = {};

  if (data.full_name !== undefined) {
    userUpdates.full_name = data.full_name.trim();
  }

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();

    if (email !== (patient.user.email || "").toLowerCase()) {
      // Changing the login email needs the current password
      await verifyPasswordOrFail(userId, data.current_password);

      const existing = await patientProfileRepository.findUserByEmail(email);

      if (existing && Number(existing.id) !== Number(userId)) {
        throw createError(409, "Cet email est déjà utilisé.");
      }

      userUpdates.email = email;
    }
  }

  const patientUpdates = {};

  for (const field of PATIENT_FIELDS) {
    if (data[field] !== undefined) patientUpdates[field] = data[field];
  }

  if (patientUpdates.commune_id) {
    // The commune decides the wilaya
    const commune = await patientProfileRepository.findCommune(
      patientUpdates.commune_id,
    );

    if (!commune) throw createError(400, "Commune introuvable.");

    patientUpdates.wilaya_id = commune.wilaya_id;
  } else if (
    patientUpdates.wilaya_id &&
    patientUpdates.commune_id === undefined &&
    Number(patientUpdates.wilaya_id) !== Number(patient.wilaya_id)
  ) {
    // New wilaya: the old commune is no longer valid
    patientUpdates.commune_id = null;
  }

  const transaction = await sequelize.transaction();

  try {
    if (Object.keys(userUpdates).length) {
      await patientProfileRepository.updateUser(patient.user, userUpdates, {
        transaction,
      });
    }

    if (Object.keys(patientUpdates).length) {
      await patientProfileRepository.updatePatient(patient, patientUpdates, {
        transaction,
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      throw createError(409, "Cet email est déjà utilisé.");
    }

    throw error;
  }

  return {
    message: "Profil mis à jour.",
    profile: await exports.getProfile(userId),
  };
};

exports.changePassword = async (
  userId,
  { current_password, new_password, refreshToken },
) => {
  const user = await verifyPasswordOrFail(userId, current_password);

  if (current_password === new_password) {
    throw createError(400, "Le nouveau mot de passe doit être différent.");
  }

  const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
  const transaction = await sequelize.transaction();

  try {
    await patientProfileRepository.updateUser(
      user,
      { password_hash },
      { transaction },
    );

    // Close all other devices, keep this one if its refresh token is sent
    await patientProfileRepository.revokeOtherRefreshTokens({
      userId,
      keepHash: refreshToken ? hashToken(refreshToken) : null,
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return { message: "Mot de passe modifié avec succès." };
};

// Account is anonymized, not removed: appointment history stays consistent
exports.deleteAccount = async (userId, password) => {
  const user = await verifyPasswordOrFail(userId, password);
  const patient = await patientProfileRepository.findPatientByUserId(userId);

  if (!patient) throw createError(404, "Patient introuvable.");

  const randomHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    BCRYPT_ROUNDS,
  );

  const clearedFields = Object.fromEntries(
    PATIENT_FIELDS.map((f) => [f, null]),
  );
  const transaction = await sequelize.transaction();

  try {
    // Frees the doctors' slots
    await patientProfileRepository.cancelActiveAppointments(
      patient.id,
      transaction,
    );

    await patientProfileRepository.updatePatient(patient, clearedFields, {
      transaction,
    });

    await patientProfileRepository.updateUser(
      user,
      {
        full_name: DELETED_NAME,
        email: `deleted-${user.id}@deleted.invalid`,
        phone: `del${user.id}`,
        password_hash: randomHash,
        is_active: false,
      },
      { transaction },
    );

    await patientProfileRepository.revokeAllRefreshTokens(user.id, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return { message: "Compte supprimé." };
};
