const { z } = require("zod");

const {
  algerianPhoneSchema,
  emailSchema,
} = require("../shared/common.validation");

const idSchema = z.coerce
  .number()
  .int("L'identifiant doit être un entier.")
  .positive("Identifiant invalide.");

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom complet doit contenir au moins 2 caractères.")
  .max(100, "Le nom complet est trop long.");

const genderSchema = z
  .enum(["male", "female"], {
    message: "Le genre doit être male ou female.",
  })
  .nullable()
  .optional();

const dateOfBirthSchema = z
  .string()
  .nullable()
  .optional()
  .refine((value) => {
    if (value == null || value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "La date de naissance est invalide.");

const createPatientSchema = z
  .object({
    full_name: fullNameSchema,
    phone: algerianPhoneSchema,
    email: emailSchema.nullable().optional(),
    gender: genderSchema,
    date_of_birth: dateOfBirthSchema,
  })
  .strict();

const updatePatientSchema = z
  .object({
    full_name: fullNameSchema.optional(),
    phone: algerianPhoneSchema.optional(),
    email: emailSchema.nullable().optional(),
    gender: genderSchema,
    date_of_birth: dateOfBirthSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni.",
  });

const patientSearchSchema = z
  .object({
    q: z.string().trim().min(1).max(100),
  })
  .strict();

const patientListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

const recentPatientsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const patientIdParamsSchema = z
  .object({
    id: idSchema,
  })
  .strict();

module.exports = {
  createPatientSchema,
  updatePatientSchema,
  patientSearchSchema,
  patientListQuerySchema,
  recentPatientsQuerySchema,
  patientIdParamsSchema,
};
