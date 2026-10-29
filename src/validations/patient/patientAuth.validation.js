const { z } = require("zod");
const {
  textSchema,
  phoneSchema,
  emailSchema,
  newPasswordSchema,
  currentPasswordSchema,
  refreshTokenSchema,
} = require("./patientCommon.validation");

const registerSchema = z
  .object({
    full_name: textSchema({
      min: 2,
      max: 100,
      message: "Nom complet invalide (2 à 100 caractères).",
    }),
    email: emailSchema,
    phone: phoneSchema,
    password: newPasswordSchema,
  })
  .strict();

const loginSchema = z
  .object({
    email: emailSchema,
    password: currentPasswordSchema,
  })
  .strict();

const refreshSchema = z
  .object({
    refreshToken: refreshTokenSchema,
  })
  .strict();

const logoutSchema = z
  .object({
    refreshToken: refreshTokenSchema.optional(),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
};
