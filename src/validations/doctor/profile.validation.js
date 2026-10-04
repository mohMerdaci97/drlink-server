const { z } = require("zod");

const {
  algerianPhoneSchema,
  emailSchema,
  passwordSchema,
} = require("../shared/common.validation");

const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(100, "Le nom complet est trop long.")
      .optional(),

    phone: algerianPhoneSchema.optional(),

    email: emailSchema.nullable().optional(),

    description: z
      .string()
      .trim()
      .max(1000, "La description est trop longue.")
      .nullable()
      .optional(),
  })
  .strict();

const updateSlotDurationSchema = z
  .object({
    slot_duration: z.coerce
      .number()
      .int()
      .refine(
        (value) => [10,15, 20, 30, 45, 60].includes(value),
        "slot_duration doit être l'une des valeurs suivantes : 10,15, 20, 30, 45, 60.",
      ),
  })
  .strict();

const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "Le mot de passe actuel est requis."),

    new_password: passwordSchema,
  })
  .strict();

const resetPasswordSchema = z
  .object({
    new_password: passwordSchema,
  })
  .strict();

module.exports = {
  updateProfileSchema,
  updateSlotDurationSchema,
  changePasswordSchema,
  resetPasswordSchema,
};