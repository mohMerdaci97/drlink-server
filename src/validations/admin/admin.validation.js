const { z } = require("zod");

const {
  algerianPhoneSchema,
  emailSchema,
  passwordSchema,
  paginationQuerySchema,
  searchQuerySchema,
} = require("../shared/common.validation");

const createAdminSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(100, "Le nom complet est trop long."),

    phone: algerianPhoneSchema,

    email: emailSchema.nullable().optional(),

    password: passwordSchema,
  })
  .strict();

const updateAdminSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(100, "Le nom complet est trop long.")
      .optional(),

    phone: algerianPhoneSchema.optional(),

    email: emailSchema.nullable().optional(),
  })
  .strict();

const resetAdminPasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

const adminListQuerySchema = z
  .object({
    ...searchQuerySchema.shape,
    ...paginationQuerySchema.shape,
  })
  .strict();

module.exports = {
  createAdminSchema,
  updateAdminSchema,
  resetAdminPasswordSchema,
  adminListQuerySchema,
};
