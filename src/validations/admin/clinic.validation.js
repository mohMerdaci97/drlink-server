const { z } = require("zod");

const { algerianPhoneSchema } = require("../shared/common.validation");

const createClinicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom de la clinique doit contenir au moins 2 caractères.")
      .max(150, "Le nom de la clinique est trop long."),

    address: z
      .string()
      .trim()
      .min(2, "L'adresse est requise.")
      .max(255, "Adresse trop longue."),

    phone: algerianPhoneSchema.optional(),

    wilaya_id: z.coerce.number().int().positive(),

    commune_id: z.coerce.number().int().positive(),

    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),

    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  })
  .strict();

const updateClinicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom de la clinique doit contenir au moins 2 caractères.")
      .max(150, "Le nom de la clinique est trop long.")
      .optional(),

    address: z
      .string()
      .trim()
      .min(2, "L'adresse est requise.")
      .max(255, "Adresse trop longue.")
      .optional(),

    phone: algerianPhoneSchema.nullable().optional(),

    wilaya_id: z.coerce.number().int().positive().optional(),

    commune_id: z.coerce.number().int().positive().optional(),

    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),

    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  })
  .strict();

module.exports = {
  createClinicSchema,
  updateClinicSchema,
};
