const repository = require("../../repositories/doctor/doctorProfile.repository");

const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

const ALLOWED_SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

const getDoctorWithProfile = async (userId) => {
  const doctor = await repository.findDoctorWithProfile(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");

    error.status = 404;

    throw error;
  }

  return doctor;
};

const getDoctor = async (userId) => {
  const doctor = await repository.findDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Profil médecin introuvable.");

    error.status = 404;

    throw error;
  }

  return doctor;
};

/* =========================================================
   GET PROFILE
========================================================= */

exports.getProfile = async (userId) => {
  const doctor = await getDoctorWithProfile(userId);

  const [total, completed, cancelled, uniquePatients, clinicCount] =
    await Promise.all([
      repository.countAppointments(doctor.id),

      repository.countAppointments(doctor.id, {
        status: "completed",
      }),

      repository.countAppointments(doctor.id, {
        status: "cancelled",
      }),

      repository.countUniquePatients(doctor.id),

      repository.countClinics(doctor.id),
    ]);

  return {
    id: doctor.id,

    user_id: doctor.user_id,

    full_name: doctor.User?.full_name ?? "—",

    phone: doctor.User?.phone ?? "—",

    email: doctor.User?.email ?? null,

    description: doctor.description ?? null,

    photo_url: doctor.photo_url ?? null,

    is_approved: doctor.is_approved,

    slot_duration: doctor.slot_duration,

    specialty: doctor.Specialty ?? null,

    member_since: doctor.User?.created_at ?? null,

    stats: {
      total_appointments: total,

      completed,

      cancelled,

      unique_patients: uniquePatients,

      clinic_count: clinicCount,

      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  };
};

/* =========================================================
   UPDATE PROFILE
========================================================= */

exports.updateProfile = async (userId, data) => {
  const doctor = await getDoctorWithProfile(userId);

  const user = await repository.findUserById(userId);

  if (!user) {
    const error = new Error("Utilisateur introuvable.");

    error.status = 404;

    throw error;
  }

  const { full_name, phone, email, description } = data;

  /* -------------------------
     Phone uniqueness
  ------------------------- */

  if (phone && phone !== user.phone) {
    const exists = await repository.findUserByPhone(phone, user.id);

    if (exists) {
      const error = new Error("Ce numéro est déjà utilisé.");

      error.status = 400;

      throw error;
    }
  }

  /* -------------------------
     Email uniqueness
  ------------------------- */

  if (email && email !== user.email) {
    const exists = await repository.findUserByEmail(email, user.id);

    if (exists) {
      const error = new Error("Cet email est déjà utilisé.");

      error.status = 400;

      throw error;
    }
  }

  /* -------------------------
     User update
  ------------------------- */

  const userUpdates = {};

  if (full_name?.trim()) {
    userUpdates.full_name = full_name.trim();
  }

  if (phone?.trim()) {
    userUpdates.phone = phone.trim();
  }

  userUpdates.email = email?.trim() || null;

  await repository.updateUser(user, userUpdates);

  /* -------------------------
     Doctor update
  ------------------------- */

  if (description !== undefined) {
    await repository.updateDoctor(doctor, {
      description: description?.trim() || null,
    });
  }

  return {
    message: "Profil mis à jour.",
  };
};

/* =========================================================
   UPDATE PHOTO
========================================================= */

exports.updatePhoto = async (userId, file) => {
  if (!file) {
    const error = new Error("Aucune photo fournie.");

    error.status = 400;

    throw error;
  }

  const doctor = await getDoctor(userId);

  const newPhotoUrl = `/uploads/doctors/${file.filename}`;

  const oldPhotoUrl = doctor.photo_url;

  await repository.updateDoctor(doctor, {
    photo_url: newPhotoUrl,
  });

  /*
   * Delete old physical file only
   * after DB update succeeded.
   */
  if (oldPhotoUrl && oldPhotoUrl !== newPhotoUrl) {
    const oldFilePath = path.join(__dirname, "../../", oldPhotoUrl);

    if (fs.existsSync(oldFilePath)) {
      fs.unlink(oldFilePath, (error) => {
        if (error) {
          console.warn("Could not delete old photo:", error.message);
        }
      });
    }
  }

  return {
    message: "Photo mise à jour.",

    photo_url: doctor.photo_url,
  };
};

/* =========================================================
   UPDATE SLOT DURATION
========================================================= */

exports.updateSlotDuration = async (userId, slotDuration) => {
  const parsed = parseInt(slotDuration, 10);

  if (!ALLOWED_SLOT_DURATIONS.includes(parsed)) {
    const error = new Error(
      `slot_duration doit être l'une des valeurs suivantes : ${ALLOWED_SLOT_DURATIONS.join(", ")}.`,
    );

    error.status = 400;

    throw error;
  }

  const doctor = await getDoctor(userId);

  await repository.updateDoctor(doctor, {
    slot_duration: parsed,
  });

  return {
    message: "Durée des créneaux mise à jour.",

    slot_duration: doctor.slot_duration,
  };
};

/* =========================================================
   CHANGE PASSWORD
========================================================= */

exports.changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    const error = new Error("Mot de passe actuel et nouveau requis.");

    error.status = 400;

    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error(
      "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    );

    error.status = 400;

    throw error;
  }

  const user = await repository.findUserById(userId);

  if (!user) {
    const error = new Error("Utilisateur introuvable.");

    error.status = 404;

    throw error;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!valid) {
    const error = new Error("Mot de passe actuel incorrect.");

    error.status = 400;

    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await repository.updateUser(user, {
    password_hash: passwordHash,
  });

  return {
    message: "Mot de passe modifié avec succès.",
  };
};

/* =========================================================
   RESET PASSWORD
========================================================= */

exports.resetPassword = async (userId, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    const error = new Error("Password must be at least 6 characters.");

    error.status = 400;

    throw error;
  }

  const user = await repository.findUserById(userId);

  if (!user) {
    const error = new Error("Utilisateur introuvable.");

    error.status = 404;

    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await repository.updateUser(user, {
    password_hash: passwordHash,

    must_change_password: false,
  });

  return {
    message: "Password updated.",
  };
};
