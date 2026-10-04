const { z } = require("zod");

const {
  algerianPhoneSchema,
  emailSchema,
  passwordSchema,
  searchQuerySchema,
} = require("../shared/common.validation");

const assistantListQuerySchema = z
  .object({
    ...searchQuerySchema.shape,
  })
  .strict();

const createAssistantSchema = z
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

const updateAssistantSchema = z
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

module.exports = {
  assistantListQuerySchema,
  createAssistantSchema,
  updateAssistantSchema,
};
