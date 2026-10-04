const { z } = require("zod");

const idSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

const doctorIdSchema = z
  .object({
    doctorId: z.coerce.number().int().positive(),
  })
  .strict();

const patientIdSchema = z
  .object({
    patientId: z.coerce.number().int().positive(),
  })
  .strict();

const clinicIdSchema = z
  .object({
    clinicId: z.coerce.number().int().positive(),
  })
  .strict();

const scheduleIdSchema = z
  .object({
    scheduleId: z.coerce.number().int().positive(),
  })
  .strict();

const wilayaIdSchema = z
  .object({
    wilayaId: z.coerce.number().int().positive(),
  })
  .strict();

const paymentIdSchema = z
  .object({
    paymentId: z.coerce.number().int().positive(),
  })
  .strict();

const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),

    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const searchQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, "La recherche est trop longue.")
      .optional(),
  })
  .strict();

const algerianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(05|06|07)[0-9]{8}$/, "Numéro de téléphone algérien invalide.");

const emailSchema = z
  .string()
  .trim()
  .email("Adresse email invalide.")
  .max(255, "Adresse email trop longue.");

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe est trop long.")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre.");

module.exports = {
  idSchema,
  doctorIdSchema,
  patientIdSchema,
  clinicIdSchema,
  scheduleIdSchema,
  wilayaIdSchema,
  paymentIdSchema,
  paginationQuerySchema,
  searchQuerySchema,
  algerianPhoneSchema,
  emailSchema,
  passwordSchema,
};
