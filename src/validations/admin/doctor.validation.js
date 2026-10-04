const { z } = require("zod");

const {
  algerianPhoneSchema,
  emailSchema,
  passwordSchema,
} = require("../shared/common.validation");

const createDoctorSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(100, "Le nom complet est trop long."),

    phone: algerianPhoneSchema,

    email: emailSchema.nullable().optional(),

    temp_password: passwordSchema,
  })
  .strict();

module.exports = {
  createDoctorSchema,
};