const { z } = require("zod");
const {
  idSchema,
  textSchema,
  dateSchema,
  emailSchema,
  newPasswordSchema,
  currentPasswordSchema,
  refreshTokenSchema,
} = require("./patientCommon.validation");

const GENDERS = ["male", "female"];

const todayUtc = () => new Date().toISOString().slice(0, 10);

const birthDateSchema = dateSchema(
  "Date de naissance invalide (AAAA-MM-JJ).",
).refine(
  (value) => value >= "1900-01-01" && value <= todayUtc(),
  "Date de naissance invalide.",
);

// Every field is optional; null clears an optional field
const updateProfileSchema = z
  .object({
    full_name: textSchema({
      min: 2,
      max: 100,
      message: "Nom complet invalide (2 à 100 caractères).",
    }).optional(),
    email: emailSchema.optional(),
    // Needed only when the email changes
    current_password: currentPasswordSchema.optional(),
    date_of_birth: birthDateSchema.nullable().optional(),
    gender: z
      .enum(GENDERS, { message: "Genre invalide." })
      .nullable()
      .optional(),
    wilaya_id: idSchema("Wilaya invalide.").nullable().optional(),
    commune_id: idSchema("Commune invalide.").nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Aucune modification fournie.",
  );

const changePasswordSchema = z
  .object({
    current_password: currentPasswordSchema,
    new_password: newPasswordSchema,
    // Keeps this device logged in
    refreshToken: refreshTokenSchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.current_password !== data.new_password,
    "Le nouveau mot de passe doit être différent.",
  );

const deleteAccountSchema = z
  .object({
    current_password: currentPasswordSchema,
  })
  .strict();

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
};
